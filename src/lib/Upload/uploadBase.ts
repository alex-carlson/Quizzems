import { v4 as uuidv4 } from 'uuid';
import { apiFetch } from '$lib/api/fetchdata';
import { get } from 'svelte/store';
import { user } from '$store/user';
import { addToast } from '$store/toast';
import { QuestionType, AnswerType } from '$lib/types/enums';

// User interface for type safety
interface User {
    public_id: string;
    id: string;
    username: string;
}

// Helper function to safely get current user
function getCurrentUser(): User {
    const usr = get(user) as User | null;
    if (!usr?.public_id) {
        throw new Error('User not authenticated');
    }
    return usr;
}

// Base upload configuration interface
export interface UploadConfig {
    endpoint: string;
    method?: 'POST' | 'PUT' | 'DELETE';
    isFormData?: boolean;
    successMessage?: string;
    errorMessage?: string;
    includeUserAuth?: boolean;
    includeFolder?: boolean;
    generateUuid?: boolean;
}

// Base upload data interface
export interface BaseUploadData {
    category?: string;
    answer?: string | string[];
    answers?: string[];
    type?: string;
    questionType?: QuestionType;
    answerType?: AnswerType;
    extra?: string;
    [key: string]: unknown;
}

// Default configuration
const DEFAULT_CONFIG: Required<UploadConfig> = {
    endpoint: '',
    method: 'POST',
    isFormData: false,
    successMessage: 'Operation completed successfully!',
    errorMessage: 'Operation failed. Please try again.',
    includeUserAuth: true,
    includeFolder: true,
    generateUuid: false
};

// Base upload function that handles common patterns
export async function baseUpload<T = unknown>(
    data: BaseUploadData,
    config: UploadConfig
): Promise<T | null> {
    const fullConfig = { ...DEFAULT_CONFIG, ...config };

    try {
        const usr = fullConfig.includeUserAuth ? getCurrentUser() : null;

        let payload: FormData | Record<string, unknown>;

        if (fullConfig.isFormData) {
            payload = new FormData();

            // Add common FormData fields
            if (fullConfig.includeUserAuth && usr) {
                (payload as FormData).append('author', usr.username);
                (payload as FormData).append('author_uuid', usr.id);
                (payload as FormData).append('author_id', usr.public_id);
            }

            if (fullConfig.includeFolder && usr && data.category) {
                (payload as FormData).append('folder', `${usr.username}/${data.category}`);
            }

            if (fullConfig.generateUuid) {
                const uuid = (data.uuid as string) || uuidv4();
                (payload as FormData).append('uuid', uuid);
            }

            // Add all other data fields
            Object.entries(data).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    const stringValue = typeof value === 'string' ? value : String(value);
                    (payload as FormData).append(key, stringValue);
                }
            });
        } else {
            payload = { ...data };

            // Add common object fields
            if (fullConfig.includeUserAuth && usr) {
                payload.author = usr.username;
                payload.author_uuid = usr.id;
                payload.author_id = usr.public_id;
            }

            if (fullConfig.includeFolder && usr && data.category) {
                payload.folder = `${usr.username}/${data.category}`;
            }

            if (fullConfig.generateUuid) {
                payload.uuid = (data.uuid as string) || uuidv4();
            }
        }

        const result = await apiFetch(fullConfig.endpoint, fullConfig.method, payload as never, fullConfig.isFormData);

        if (fullConfig.successMessage) {
            addToast({
                message: fullConfig.successMessage,
                type: 'success',
                duration: 3000
            });
        }

        return result;
    } catch (error) {
        console.error(`Error in ${fullConfig.endpoint}:`, error);

        if (fullConfig.errorMessage) {
            addToast({
                message: fullConfig.errorMessage,
                type: 'error',
                duration: 3000
            });
        }

        return null;
    }
}

// Validation helpers
export const validators = {
    required: (value: unknown, fieldName: string): boolean => {
        const isValid = value && (typeof value === 'string' ? value.trim() : value);
        if (!isValid) {
            addToast({
                type: 'error',
                message: `Please enter ${fieldName}.`
            });
        }
        return Boolean(isValid);
    },

    requiredFile: (file: unknown, fieldName: string): boolean => {
        if (!file) {
            addToast({
                type: 'error',
                message: `Please add ${fieldName}.`
            });
            return false;
        }
        return true;
    },

    answers: (item: Record<string, unknown>): boolean => {
        const hasAnswer = item.answer && (typeof item.answer === 'string' && item.answer.trim());
        const hasAnswers = Array.isArray(item.answers)
            ? item.answers.join('').trim()
            : item.answers && (typeof item.answers === 'string' && item.answers.trim());

        if (!hasAnswer && !hasAnswers) {
            addToast({
                type: 'error',
                message: 'Please enter an answer.'
            });
            return false;
        }
        return true;
    }
};

// Item reset helper
export function resetItem(item: Record<string, unknown>, fieldsToKeep: string[] = ['category']) {
    const keepValues: Record<string, unknown> = {};
    fieldsToKeep.forEach(field => {
        if (item[field] !== undefined) {
            keepValues[field] = item[field];
        }
    });

    // Clear all properties
    Object.keys(item).forEach(key => {
        delete item[key];
    });

    // Restore kept values
    Object.assign(item, keepValues);

    // Clear DOM inputs
    const inputs = document.querySelectorAll('input, textarea');
    inputs.forEach((input) => {
        const htmlInput = input as HTMLInputElement;
        if (htmlInput.type !== 'file') {
            htmlInput.value = '';
        }
    });
}

// Focus helper
export function focusElement(selector: string, scrollBehavior: ScrollBehavior = 'smooth') {
    setTimeout(() => {
        const element = document.querySelector(selector) as HTMLElement;
        if (element) {
            element.focus();
            element.scrollIntoView({ behavior: scrollBehavior, block: 'center' });
        }
    }, 100);
}

// Event dispatch helper for consistent item addition events
export interface ItemAddedEventDetail {
    items: unknown[];
    itemsLength: number;
    type: string;
}

export function createItemAddedEvent(result: unknown, type: string): ItemAddedEventDetail | null {
    if (!result || !Array.isArray(result) || !result[0]?.items) {
        return null;
    }

    return {
        items: result[0].items,
        itemsLength: result[0].items.length,
        type
    };
}