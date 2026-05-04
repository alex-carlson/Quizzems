import { v4 as uuidv4 } from 'uuid';
import { apiFetch } from '$lib/api/fetchdata';
import { get } from 'svelte/store';
import { user } from '$store/user';
import { addToast } from '$store/toast';

// Helper function to safely get current user
function getCurrentUser() {
    const usr = get(user);
    if (!usr?.public_id) {
        throw new Error('User not authenticated');
    }
    return usr;
}

function addUserAuthToFormData(formData, usr, category) {
    formData.append('author', usr.username);
    formData.append('author_uuid', usr.id);
    formData.append('author_id', usr.public_id);
    if (category) {
        formData.append('folder', `${usr.username}/${category}`);
        formData.append('category', category);
    }
}

function addUserAuthToData(data, usr, category) {
    data.author = usr.username;
    data.author_uuid = usr.id;
    data.author_id = usr.public_id;
    if (category) {
        data.folder = `${usr.username}/${category}`;
    }
    return data;
}

// Common error handling wrapper
async function handleUpload(uploadFn, errorMessage, successMessage) {
    try {
        const result = await uploadFn();
        if (successMessage) {
            addToast({
                message: successMessage,
                type: 'success',
                duration: 3000
            });
        }
        return result;
    } catch (error) {
        console.error(errorMessage, error);
        addToast({
            message: errorMessage,
            type: 'error',
            duration: 3000
        });
        return error;
    }
}

// Create new collection
export async function createCollection(category) {
    const usr = getCurrentUser();
    try {
        const data = addUserAuthToData({
            category,
        }, usr, undefined);
        const created = await apiFetch('/collections/createCollection', 'POST', data);
        return created;
    } catch (error) {
        console.error('Error creating collection:', error);
        throw new Error('Create failed. Please try again.');
    }
}

// Remove item
export async function removeItem(itemId, category) {
    try {
        const result = await apiFetch('/items/delete', 'DELETE', {
            category,
            itemId
        });
        return result;
    } catch (error) {
        console.error('Error removing item:', error);
        throw new Error('Remove failed. Please try again.');
    }
}

export async function saveEdit(data) {
    try {
        const result = await apiFetch('/items/edit', 'POST', data);
        addToast({
            message: 'Item edited successfully!',
            type: 'success',
            duration: 3000
        });
        return result;
    } catch (error) {
        console.error('Error editing item:', error);
        addToast({
            message: 'Failed to save item changes. Please try again.',
            type: 'error',
            duration: 3000
        });
        throw error; // Re-throw the error so the caller knows it failed
    }
}

// Reorder items
export async function reorderItems(prevIndex, newIndex, data) {
    try {
        const currentUser = getCurrentUser();
        const items = [...data.items];
        const [moved] = items.splice(prevIndex, 1);
        items.splice(newIndex, 0, moved);

        const payload = {
            category: data.category,
            items,
            author_id: currentUser.public_id,
        };

        const result = await apiFetch('/items/reorder', 'POST', payload);
        return result;
    } catch (error) {
        console.error('Error reordering items:', error);
        return null;
    }
}

// Delete collection
export async function deleteCollection(collectionId, onSuccess = () => { }) {
    try {
        const currentUser = getCurrentUser();
        const uid = currentUser.public_id;
        const collection = collectionId;
        const result = await apiFetch(`/collections/${uid}/${collection}`, 'DELETE');
        onSuccess(result);
    } catch (error) {
        console.error('Error deleting collection:', error);
        throw new Error('Delete failed. Please try again.');
    }
}

// show confirm delete popup
export function confirmDelete(id, onSuccess = () => { }) {
    if (confirm('Are you sure you want to delete this collection?')) {
        deleteCollection(id, onSuccess);
    }
}

// Upload data
export async function uploadData(item, uuid = uuidv4(), forceJpg = false) {
    const usr = getCurrentUser();

    // If file is a URL (string), call /upload-url
    if (typeof item.file === 'string') {
        console.log("Item:", item);
        return handleUpload(async () => {
            const data = addUserAuthToData({
                uuid,
                url: item.file,
                forceJpeg: forceJpg,
                question: item.question,
                answer: item.answer ?? item.answers,
                answers: item.answers,
                src: item.src,
                supplemental: item.supplemental_text || item.supplemental,
                extra: item.extra || null,
                type: item.type,
                questionType: item.questionType,
                answerType: item.answerType,
                category: item.category,
                existingItemId: item.existingItemId,
                isUpdate: item.isUpdate,
            }, usr, item.category);
            return await apiFetch('/items/upload-url', 'POST', data, false, true);
        }, 'Error uploading URL data', undefined);
    }

    // Validate that file is actually a File or Blob object
    if (!item.file || (typeof item.file !== 'object') || !(item.file instanceof File || item.file instanceof Blob)) {
        console.error('Invalid file object:', item.file, 'Type:', typeof item.file);
        throw new Error('Invalid file object provided for upload');
    }

    return handleUpload(async () => {
        const formData = new FormData();
        formData.append('id', item.id || uuid);
        formData.append('uuid', uuid);
        formData.append('file', item.file);
        formData.append('forceJpeg', forceJpg.toString());
        formData.append('answer', item.answer || '');
        addUserAuthToFormData(formData, usr, item.category);

        if (item.question) {
            formData.append('question', item.question);
        }
        if (item.answers) {
            if (Array.isArray(item.answers)) {
                formData.append('answers', JSON.stringify(item.answers));
            } else {
                formData.append('answers', item.answers);
            }
        }
        if (item.src) {
            formData.append('src', item.src);
        }
        if (item.supplemental_text || item.supplemental) {
            formData.append('supplemental', item.supplemental_text || item.supplemental);
        }
        if (item.extra) {
            formData.append('extra', item.extra);
        }
        if (item.type) {
            formData.append('type', item.type);
        }
        if (item.questionType) {
            formData.append('questionType', item.questionType);
        }
        if (item.answerType) {
            formData.append('answerType', item.answerType);
        }
        // Add existing item ID for server validation during updates
        if (item.existingItemId) {
            formData.append('existingItemId', item.existingItemId);
        }
        // Add update flag to indicate this is an update operation
        if (item.isUpdate) {
            formData.append('isUpdate', item.isUpdate.toString());
        }

        return await apiFetch('/items/upload', 'POST', formData as never, true);
    }, 'Error uploading file', undefined);
}

export async function uploadAudio(item) {
    const usr = getCurrentUser();
    const uuid = item.uuid || uuidv4();

    return handleUpload(async () => {
        const formData = new FormData();
        addUserAuthToFormData(formData, usr, item.category);
        formData.append('type', 'audio');
        formData.append('questionType', item.questionType || 'audio');
        formData.append('answerType', item.answerType || 'single');
        formData.append('id', uuid);
        formData.append('audio', item.videoId);
        formData.append('title', item.title);
        formData.append('answer', item.title);
        formData.append('thumbnail', item.thumbnail);
        formData.append('url', item.videoId);

        return await apiFetch('/items/add-audio', 'POST', formData as never, true);
    }, 'Error uploading audio data', undefined);
}

export async function uploadQuestion(data) {
    const usr = getCurrentUser();

    return handleUpload(async () => {
        const questionData = addUserAuthToData({
            uuid: uuidv4(),
            question: data.question,
            answer: data.answers ?? data.answer,
            category: data.category,
            type: data.type,
            questionType: data.questionType || 'text',
            answerType: data.answerType || 'single',
        }, usr, data.category);

        if (data.numRequired != null) {
            questionData.numRequired = data.numRequired;
        }

        return await apiFetch('/items/add-question', 'POST', questionData);
    }, 'Error uploading question data', undefined);
}

export async function uploadThumbnail(data, category) {
    const usr = getCurrentUser();

    return handleUpload(async () => {
        const formData = new FormData();
        addUserAuthToFormData(formData, usr, undefined);

        const safeCategory = category.replace(/[^a-zA-Z0-9-_]/g, '');
        formData.append('uuid', 'thumbnails/' + safeCategory + '/thumbnail');
        formData.append('file', data);
        formData.append('forceJpeg', 'true');
        formData.append('category', category);
        formData.append('folder', `/thumbnails/${category}`);

        return await apiFetch('/items/add-thumbnail', 'POST', formData as never, true);
    }, 'Error uploading thumbnail', 'Thumbnail uploaded successfully!');
}