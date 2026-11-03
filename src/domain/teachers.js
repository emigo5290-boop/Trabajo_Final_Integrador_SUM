export function teacherCards(teachers, classes, enrollments) {
  return teachers.map((teacher) => ({
    ...teacher,
    clases: classes
      .filter((lesson) => (teacher.claseIds || []).includes(lesson.id))
      .map((lesson) => ({
        ...lesson,
        alumnos: enrollments.filter((record) => record.claseId === lesson.id)
          .length,
      })),
  }));
}
