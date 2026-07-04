import {
    baseUpload,
    validators,
    resetItem,
    focusElement,
    createItemAddedEvent,
    type BaseUploadData,
    type ItemAddedEventDetail
} from './uploadBase';
import { v4 as uuidv4 } from 'uuid';
import { QuestionType, AnswerType } from '$lib/types/enums';

// Specific upload data interfaces
export interface ImageUploadData extends BaseUploadData {
    file: File | string;
    forceJpeg?: boolean;
}

export interface AudioUploadData extends BaseUploadData {
    videoId: string;
    title: string;
    thumbnail: string;
    uuid?: string;
}

export interface QuestionUploadData extends BaseUploadData {
    question: string;
    numRequired?: number;
}

export interface ThumbnailUploadData {
    file: File;
    category: string;
}

// Refactored upload functions using baseUpload

export async function uploadData(item: ImageUploadData, uuid = uuidv4(), forceJpg = false) {
    if (!validators.answers(item)) return null;
    if (!validators.requiredFile(item.file, 'an image')) return null;

    // Handle URL uploads vs file uploads
    if (typeof item.file === 'string') {
        return baseUpload({
            ...item,
            uuid,
            url: item.file,
            forceJpeg: forceJpg,
            author_id: undefined, // Will be set by baseUpload
        }, {
            endpoint: '/items/upload-url',
            errorMessage: 'Failed to upload image. Please try again.',
            generateUuid: true
        });
    }

    // File upload requires FormData
    const formDataItem = {
        ...item,
        uuid,
        file: item.file,
        forceJpeg: forceJpg.toString(),
        questionType: (item.questionType as QuestionType) || QuestionType.IMAGE,
        answerType: (item.answerType as AnswerType) || AnswerType.SINGLE,
    };

    return baseUpload(formDataItem, {
        endpoint: '/items/upload',
        isFormData: true,
        errorMessage: 'Failed to upload image. Please try again.',
        generateUuid: true
    });
}

export async function uploadAudio(item: AudioUploadData) {
    const audioData = {
        ...item,
        questionType: QuestionType.AUDIO,
        answerType: item.answerType || AnswerType.SINGLE,
        id: item.uuid || uuidv4(),
        audio: item.videoId,
        answer: item.title,
        url: item.videoId,
    };

    return baseUpload(audioData, {
        endpoint: '/items/add-audio',
        isFormData: true,
        errorMessage: 'Failed to add audio. Please try again.',
    });
}

export async function uploadQuestion(data: QuestionUploadData) {
    if (!validators.required(data.question, 'a question')) return null;

    const questionData = {
        ...data,
        answer: data.answer ?? data.answers,
        uuid: uuidv4(),
        questionType: (data.questionType as QuestionType) || QuestionType.TEXT,
        answerType: (data.answerType as AnswerType) || AnswerType.SINGLE,
        author_id: undefined, // Will be overwritten by baseUpload with correct field name
    };

    // Handle numRequired field
    if (data.numRequired != null) {
        questionData.numRequired = data.numRequired;
    }

    return baseUpload(questionData, {
        endpoint: '/items/add-question',
        errorMessage: 'Failed to add question. Please try again.',
    });
}

export async function uploadThumbnail(data: File, category: string) {
    if (!validators.requiredFile(data, 'a thumbnail')) return null;

    const safeCategory = category.replace(/[^a-zA-Z0-9-_]/g, '');
    const thumbnailData = {
        file: data,
        uuid: 'thumbnails/' + safeCategory + '/thumbnail',
        forceJpeg: 'true',
        category,
        folder: `/thumbnails/${category}`,
    };

    return baseUpload(thumbnailData, {
        endpoint: '/items/add-thumbnail',
        isFormData: true,
        errorMessage: 'Failed to upload thumbnail. Please try again.',
    });
}

// Export utility functions for consistent usage
export {
    validators,
    resetItem,
    focusElement,
    createItemAddedEvent
};

// Common upload handler factory for components
export function createUploadHandler(
    questionType: QuestionType,
    onSuccess?: (event: ItemAddedEventDetail) => void,
    focusSelector = '#question-input-question'
) {
    return async (item: BaseUploadData) => {
        let result;

        switch (questionType) {
            case QuestionType.IMAGE:
                result = await uploadData(item as ImageUploadData);
                break;
            case QuestionType.AUDIO:
                result = await uploadAudio(item as AudioUploadData);
                break;
            case QuestionType.TEXT:
                result = await uploadQuestion(item as QuestionUploadData);
                break;
        }

        if (result && onSuccess) {
            const eventData = createItemAddedEvent(result, questionType);
            if (eventData) {
                onSuccess(eventData);
            }
        }

        if (result) {
            // Reset form and focus next input
            resetItem(item);
            focusElement(focusSelector);
        }

        return result;
    };
}