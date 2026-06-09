// src/lib/db.js

import { openDB } from 'idb';
import { browser } from '$app/environment';

let db;

async function getDb() {
  if (!browser) {
    throw new Error('IndexedDB is only available in the browser');
  }

  if (!db) {
    db = await openDB('quiz-db', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('images')) {
          db.createObjectStore('images', {
            keyPath: 'id'
          });
        }

        if (!db.objectStoreNames.contains('quizzes')) {
          db.createObjectStore('quizzes', {
            keyPath: 'id'
          });
        }
      }
    });
  }

  return db;
}

export async function saveQuiz(collectionId, cards, metadata){
    const db = await getDb();

    await db.put('quizzes', {
        id: collectionId,
        cards,
        metadata,
        author_slug: metadata?.author_slug || null,
        slug: metadata?.slug || null,
        savedAt: Date.now()
    });

    for (const card of cards) {
        if (card.type !== 'image') continue;
        if (!card.url) continue;

        try {
            const response = await fetch(card.url);
            if (!response.ok) {
                console.warn(`Failed to fetch image for offline cache: ${card.url}`);
                continue;
            }

            const blob = await response.blob();

            await db.put('images', {
                id: card.id,
                quizId: collectionId,
                url: card.url,
                blob
            });
        } catch (error) {
            console.error(`Failed to cache image ${card.url}:`, error);
        }
    }
}

export async function getSavedQuiz(collectionId) {
  const db = await getDb();

  return db.get('quizzes', collectionId);
}

export async function getSavedQuizByRoute(author_slug, slug) {
  const db = await getDb();
  const quizzes = await db.getAll('quizzes');

  return quizzes.find((quiz) => quiz.author_slug === author_slug && quiz.slug === slug) || null;
}

export async function saveImage(file) {
  const db = await getDb();

  return db.add('images', {
    id: crypto.randomUUID(),
    file
  });
}

export async function getImages() {
  const db = await getDb();

  return db.getAll('images');
}

/**
 * @param {Array} cards
 * @param {(progress: {current:number,total:number}) => void} [onProgress]
 */
export async function saveQuizImages(cards, onProgress = () => {}) {
    const db = await getDb();

    const imageCards = cards.filter((card) => card.type === 'image' && card.url?.startsWith('http'));
    const total = imageCards.length;
    let processed = 0;
    let saved = 0;

    onProgress({ current: processed, total });

    for (const card of imageCards) {
        const existing = await db.get('images', card.id);

        if (existing) {
            saved++;
            processed++;
            onProgress({ current: processed, total });
            continue;
        }

        try {
            const response = await fetch(card.url);

            if (!response.ok) {
                console.warn(`Failed: ${card.url}`);
                processed++;
                onProgress({ current: processed, total });
                continue;
            }

            const blob = await response.blob();

            await db.put('images', {
                id: card.id,
                url: card.url,
                blob
            });

            saved++;
        } catch (err) {
            console.error(card.url, err);
        }

        processed++;
        onProgress({ current: processed, total });
    }

    if (total === 0) {
        onProgress({ current: 0, total: 0 });
    }

    return saved;
}

export async function hydrateQuizImages(cards) {
  const db = await getDb();

  const hydrated = [];

  for (const card of cards) {
    const image = await db.get('images', card.id);

    if (image) {
      hydrated.push({
        ...card,
        url: URL.createObjectURL(image.blob)
      });
    } else {
      hydrated.push(card);
    }
  }

  return hydrated;
}

export async function getQuiz(id) {
  const db = await getDb();

  return db.get('quizzes', id);
}

export async function getLocalImage(cardId) {
  const db = await getDb();

  const record = await db.get('images', cardId);

  if (!record) return null;

  return URL.createObjectURL(record.blob);
}

export async function deleteQuiz(id) {
  const db = await getDb();

  const images = await db.getAll('images');

  for (const image of images) {
    if (image.quizId === id) {
      await db.delete('images', image.id);
    }
  }

  await db.delete('quizzes', id);
}