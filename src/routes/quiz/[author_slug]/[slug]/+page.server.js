// src/routes/[author_slug]/[slug]/+page.server.ts
export const prerender = false;

import { fetchUserBySlug } from '$lib/api/user';
import { fetchCollectionByAuthorAndSlug, fetchCollectionById } from '$lib/api/collections';

export const load = async ({ params, url }) => {
    const { author_slug, slug } = params;

    if (!author_slug || !slug) {
        console.error('Server: Missing required params', { author_slug, slug });

        return {
            status: 400,
            author: 'Unknown',
            category: 'Unknown',
            thumbnail: null,
            collectionId: null,
            timesPlayed: 0,
            quizScore: null,
            meta: {
                title: "Invalid URL | Quizzems",
                description: "Invalid quiz URL parameters.",
                image: "/ogimage.jpg",
                url: url.href
            }
        };
    }

    try {
        const author = await fetchUserBySlug(author_slug);

        if (!author) {
            return {
                status: 404,
                author: 'Unknown',
                category: 'Unknown',
                thumbnail: null,
                collectionId: null,
                timesPlayed: 0,
                quizScore: null,
                meta: {
                    title: "Quiz Not Found | Quizzems",
                    description: "Author not found.",
                    image: "/ogimage.jpg",
                    url: url.href
                }
            };
        }

        const collectionId = await fetchCollectionByAuthorAndSlug(author.public_id, slug);

        if (!collectionId) {
            return {
                status: 404,
                author: author.username,
                category: 'Unknown',
                thumbnail: null,
                collectionId: null,
                timesPlayed: 0,
                quizScore: null,
                meta: {
                    title: `Quiz Not Found by ${author.username} | Quizzems`,
                    description: "Collection not found.",
                    image: "/ogimage.jpg",
                    url: url.href
                }
            };
        }

        const collection = await fetchCollectionById(collectionId);
        const score = getScoreByQuizId(author?.quizzes_completed ?? [], collectionId);

        const result = {
            author: author.username,
            category: collection?.category,
            thumbnail: collection?.thumbnail_url || null,
            collectionId: collection?.id || collectionId,
            timesPlayed: collection?.times_played || 0,
            quizScore: score,
            meta: {
                title: `${collection?.category} by ${author.username} | Quizzems`,
                description: collection?.description || 'Take this quiz and test your knowledge!',
                image: collection?.thumbnail_url || '/ogimage.jpg',
                url: url.href
            }
        };

        return result;
    } catch (error) {
        console.error('Error loading quiz page:', error);

        return {
            status: 500,
            author: 'Unknown',
            category: 'Unknown',
            thumbnail: null,
            collectionId: null,
            timesPlayed: 0,
            quizScore: null,
            meta: {
                title: "Error | Quizzems",
                description: "An error occurred loading this quiz.",
                image: "/ogimage.jpg",
                url: url.href
            }
        };
    }
};

function getScoreByQuizId(data, quizId) {
    const entry = data.find((item) => item.quiz_id === quizId);
    return entry ? entry.percentage : null;
}