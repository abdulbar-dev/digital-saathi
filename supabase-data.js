(function () {
  const TABLES = {
    profiles: 'profiles',
    tutorials: 'tutorials',
    quizQuestions: 'quiz_questions',
    progress: 'user_progress',
    attempts: 'quiz_attempts',
    sessions: 'learning_sessions',
    reminders: 'reminders'
  };

  const getClient = () => window.DigitalSaathiSupabase?.client || null;
  const warn = (operation, error) => {
    if (error) console.warn(`[Digital Saathi] Supabase ${operation} unavailable; local data remains active.`, error);
  };

  async function getUserData(userId) {
    const client = getClient();
    if (!client || !userId) return null;

    const [profile, tutorials, quizQuestions, progress, attempts, reminders] = await Promise.all([
      client.from(TABLES.profiles).select('*').eq('id', userId).maybeSingle(),
      client.from(TABLES.tutorials).select('*'),
      client.from(TABLES.quizQuestions).select('*'),
      client.from(TABLES.progress).select('*').eq('user_id', userId),
      client.from(TABLES.attempts).select('*').eq('user_id', userId),
      client.from(TABLES.reminders).select('*').eq('user_id', userId)
    ]);

    [profile, tutorials, quizQuestions, progress, attempts, reminders].forEach((result, index) => {
      if (result.error) warn(['profile', 'tutorials', 'quiz questions', 'progress', 'quiz attempts', 'reminders'][index] + ' load', result.error);
    });

    return {
      profile: profile.error ? null : profile.data,
      tutorials: tutorials.error ? [] : (tutorials.data || []),
      quizQuestions: quizQuestions.error ? [] : (quizQuestions.data || []),
      progress: progress.error ? [] : (progress.data || []),
      attempts: attempts.error ? [] : (attempts.data || []),
      reminders: reminders.error ? [] : (reminders.data || [])
    };
  }

  function stateFromRemote(remote, localState, localSettings) {
    if (!remote) return null;
    const state = {
      ...localState,
      done: { ...localState.done },
      step: { ...localState.step },
      scores: { ...localState.scores }
    };

    remote.progress.forEach((row) => {
      const lessonId = row.tutorial_id || row.lesson_id || row.tutorial || row.slug;
      if (!lessonId) return;
      const step = Number(row.current_step ?? row.step ?? 0);
      state.step[lessonId] = step;
      if (row.completed === true || row.is_completed === true) state.done[lessonId] = true;
    });

    remote.attempts.forEach((row) => {
      const lessonId = row.tutorial_id || row.lesson_id || row.tutorial || row.slug;
      const score = row.score ?? row.correct_answers;
      const total = row.total_questions ?? row.total;
      if (lessonId && score != null && total != null) state.scores[lessonId] = [Number(score), Number(total)];
    });

    const reminder = remote.reminders[0];
    if (reminder) state.rem = reminder.reminder_time || reminder.time || reminder.scheduled_time || state.rem;

    const settings = remote.profile ? {
      ...localSettings,
      lang: remote.profile.language || remote.profile.lang || localSettings.lang,
      fs: Number(remote.profile.font_size || remote.profile.text_size || localSettings.fs),
      hc: remote.profile.high_contrast ?? remote.profile.hc ?? localSettings.hc,
      voice: remote.profile.voice_guidance ?? remote.profile.voice ?? localSettings.voice
    } : localSettings;

    return { state, settings };
  }

  async function saveProgress(userId, lessonId, values) {
    const client = getClient();
    if (!client || !userId || !lessonId) return;
    const { error } = await client.from(TABLES.progress).upsert({
      user_id: userId,
      tutorial_id: lessonId,
      current_step: Number(values.step || 0),
      completed: !!values.done,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id,tutorial_id' });
    warn('progress save', error);
  }

  async function saveScores(userId, scores) {
    const client = getClient();
    if (!client || !userId) return;
    await Promise.all(Object.entries(scores || {}).map(async ([lessonId, result]) => {
      const { error } = await client.from(TABLES.attempts).insert({
        user_id: userId,
        tutorial_id: lessonId,
        score: Number(result[0]),
        total_questions: Number(result[1]),
        completed_at: new Date().toISOString()
      });
      warn('quiz score save', error);
    }));
  }

  async function saveProfile(userId, settings) {
    const client = getClient();
    if (!client || !userId) return;
    const { error } = await client.from(TABLES.profiles).upsert({
      id: userId,
      language: settings.lang,
      font_size: settings.fs,
      high_contrast: !!settings.hc,
      voice_guidance: !!settings.voice,
      updated_at: new Date().toISOString()
    }, { onConflict: 'id' });
    warn('profile save', error);
  }

  async function saveReminder(userId, reminderTime) {
    const client = getClient();
    if (!client || !userId || !reminderTime) return;
    const { error } = await client.from(TABLES.reminders).upsert({
      user_id: userId,
      reminder_time: reminderTime,
      enabled: true,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' });
    warn('reminder save', error);
  }

  async function recordLearningSession(userId, durationMinutes, startedAt, endedAt) {
    const client = getClient();
    if (!client || !userId) return;
    const { error } = await client.from(TABLES.sessions).insert({
      user_id: userId,
      duration_minutes: Number(durationMinutes),
      started_at: startedAt || new Date().toISOString(),
      ended_at: endedAt || new Date().toISOString()
    });
    warn('learning session save', error);
  }

  window.DigitalSaathiData = {
    getUserData,
    stateFromRemote,
    saveProgress,
    saveScores,
    saveProfile,
    saveReminder,
    recordLearningSession
  };
})();
