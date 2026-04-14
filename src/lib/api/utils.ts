import { supabase } from '$lib/api/supabaseClient';

/**
 * Gets the user's name from the Supabase `profiles` table by their ID.
 * Returns "Anonymous" if ID is "0", or null if not found or on error.
 */
export async function getUserName(id) {
    if (id === '0') {
        return 'Anonymous';
    }

    const { data, error } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', id)
        .single();

    if (error) {
        console.error('Error fetching username:', error);
        return null;
    }

    return data?.username || "Anonymous";
}

export async function getUserQuizScores(id) {
    if (id === '0') {
        return null;
    }

    const { data, error } = await supabase
        .from('profiles')
        .select('quizzes_completed')
        .eq('id', id)
        .single();

    if (error) {
        console.error('Error fetching quiz scores:', error);
        return null;
    }

    return data.quizzes_completed || null;
}

export async function getCollectionMetadataFromId(collectionId) {
    if (!collectionId) {
        return null;
    }

    const { data, error } = await supabase
        .from('collections')
        .select('id, category, author, created_at, author_public_id, slug, private')
        .eq('id', collectionId);

    if (error) {
        console.error('Error fetching collection name:', error);
        return null;
    }

    return data || null;
}

export function areStringsClose(a, b, threshold = 1) {
    // Handle undefined/null values
    if (a == null || b == null) return false;
    if (typeof a !== 'string') a = String(a);
    if (typeof b !== 'string') b = String(b);

    const preprocess = (str) =>
        normalizeRoman(str) // First normalize roman numerals to arabic numbers
            .trim()
            .toLowerCase()
            .replace(/\b(the|and|a|an|of|in|on|at|to|for|with|by|from|as|is|are|was|were|be|been|has|have|had|do|does|did|but|or|nor|so|yet|if|then|else|when|while|about|into|over|after|before|between|under|again|further|once)\b/gi, "") // remove common stopwords
            .replace(/[^\w\s]|_|[-–—]/g, "") // remove all punctuation, underscores, hyphens, and em/en dashes
            .replace(/\s+/g, "") // remove all spaces

    a = preprocess(a);
    b = preprocess(b);

    if (!a || !b) return false;

    if (a.length < b.length) return false;

    const lenA = a.length;
    const lenB = b.length;
    const matrix = [];

    for (let i = 0; i <= lenB; i++) {
        matrix[i] = [i];
    }
    for (let j = 0; j <= lenA; j++) {
        matrix[0][j] = j;
    }

    for (let i = 1; i <= lenB; i++) {
        for (let j = 1; j <= lenA; j++) {
            if (b[i - 1] === a[j - 1]) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1,
                );
            }
        }
    }

    const distance = matrix[lenB][lenA];
    const maxLen = Math.max(lenA, lenB);
    const similarity = 1 - distance / maxLen;

    return similarity >= threshold;
}

function romanToInt(roman) {
    if (!roman) return null;
    roman = roman.toUpperCase();

    const map = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
    let value = 0;

    for (let i = 0; i < roman.length; i++) {
        const curr = map[roman[i]];
        const next = map[roman[i + 1]];

        if (next && curr < next) {
            value -= curr;
        } else {
            value += curr;
        }
    }

    return value;
}

function normalizeRoman(str) {
    // Regex for roman numerals up to 3999
    const romanRegex = /\bM{0,4}(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})\b/gi;

    return str.toLowerCase().replace(romanRegex, match => {
        const value = romanToInt(match);
        // If conversion fails (empty string), keep original
        return value ?? match;
    });
}



import { QuestionType, AnswerType, toQuestionType, toAnswerType } from '$lib/types/enums';

export function mapCards(rawItems) {
    return rawItems
        .filter((card) => card != null)
        .map((card) => {
            // Determine question type based on content
            let questionType = QuestionType.TEXT;
            if (card.image) questionType = QuestionType.IMAGE;
            else if (card.audio) questionType = QuestionType.AUDIO;

            // Determine answer type based on card properties
            let answerType = AnswerType.SINGLE;
            if (card.answerType) {
                answerType = toAnswerType(card.answerType);
            } else if (card.answers && Array.isArray(card.answers) && card.answers.length > 1) {
                answerType = AnswerType.MULTI_ANSWER;
            } else if (card.type === "multiplechoice") {
                answerType = AnswerType.MULTIPLE_CHOICE;
            }

            return {
                ...card,
                imageUrl: card.image,
                revealed: false,
                loaded: false,
                hidden: false,
                scale: 1,
                userAnswer: "",
                answer: card.answer || "",
                questionType: toQuestionType(card.questionType) || questionType,
                answerType: toAnswerType(card.answerType) || answerType,
                // Keep old type field for backward compatibility if needed
                type: card.type || questionType
            };
        });
}

export function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleDateString(undefined, {
        month: '2-digit',
        day: '2-digit'
    });
}

export function slugify(value = '') {
    return String(value)
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');
}