import ProgressModel from '../models/Progress';
import LessonModel from '../models/Lesson';
import QuizModel from '../models/Quiz';

const recommendationService = {
  async getNextRecommendation(user_id: number) {
    // 1. Find courses the user is enrolled in (by progress)
    const progress = await ProgressModel.getUserProgress(user_id);
    const completedLessonIds = new Set(progress.map((p: any) => p.lesson_id));
    // 2. Find next lesson in any course not yet completed
    const allLessons = await LessonModel.getAllLessons();
    const nextLesson = allLessons.find((l: any) => !completedLessonIds.has(l.id));
    if (nextLesson) {
      return { type: 'lesson', lesson: nextLesson };
    }
    // 3. If all lessons done, find quizzes not yet passed
    const allQuizzes = await QuizModel.getAllQuizzes();
    const passedQuizIds = new Set(progress.filter((p: any) => p.quiz_id && p.score >= 80).map((p: any) => p.quiz_id));
    const nextQuiz = allQuizzes.find((q: any) => !passedQuizIds.has(q.id));
    if (nextQuiz) {
      return { type: 'quiz', quiz: nextQuiz };
    }
    // 4. Otherwise, recommend review or congratulate
    return { type: 'complete', message: 'You are all caught up! Consider reviewing past lessons or quizzes.' };
  }
};

export default recommendationService; 