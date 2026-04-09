// Card type for FlashCards and Card components
export interface Card {
    id?: string | number;
    question: string;
    answer: string;
    image?: string;
    audio?: string;
    imageUrl?: string;
    revealed: boolean;
    loaded: boolean;
    hidden: boolean;
    scale: number;
    userAnswer: string;
    questionType?: string;
    answerType?: string;
    answerer?: string;
    incorrect?: boolean;
    isCorrect?: boolean;
    [key: string]: any;
}
