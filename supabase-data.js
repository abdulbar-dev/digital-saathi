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

  async function updateOrInsert(table, filters, values, operation) {
    const client = getClient();
    const query = client.from(table).update(values);
    Object.entries(filters).forEach(([column, value]) => query.eq(column, value));
    const { data, error } = await query.select(Object.keys(filters).join(','));
    if (error) {
      warn(`${operation} update`, error);
      return;
    }
    if (data && data.length > 0) return;

    const result = await client.from(table).insert({ ...filters, ...values });
    warn(`${operation} insert`, result.error);
  }

  async function getUserData(userId) {
    const client = getClient();
    if (!client || !userId) return null;

    const [profile, tutorials, quizQuestions, progress, attempts, reminders] = await Promise.all([
      client.from(TABLES.profiles).select('*').eq('id', userId).limit(1),
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
      profile: profile.error ? null : (profile.data?.[0] || null),
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
      const lessonId = row.tutorial_id;
      if (!lessonId) return;
      const step = Number(row.last_step ?? 0);
      state.step[lessonId] = step;
      if (row.completed === true) state.done[lessonId] = true;
    });

    remote.attempts.forEach((row) => {
      const lessonId = row.tutorial_id;
      const score = row.score;
      const total = row.total_questions;
      if (lessonId && score != null && total != null) state.scores[lessonId] = [Number(score), Number(total)];
    });

    const reminder = remote.reminders[0];
    if (reminder) state.rem = reminder.reminder_time || state.rem;

    const settings = remote.profile ? {
      ...localSettings,
      lang: remote.profile.preferred_language || localSettings.lang,
      fs: Number(remote.profile.text_size || localSettings.fs),
      voice: remote.profile.voice_enabled ?? localSettings.voice
    } : localSettings;

    return { state, settings };
  }

  async function saveProgress(userId, lessonId, values) {
    const client = getClient();
    if (!client || !userId || !lessonId) return;
    await updateOrInsert(TABLES.progress, {
      user_id: userId,
      tutorial_id: lessonId
    }, {
      last_step: Number(values.step || 0),
      completed: !!values.done,
      progress_percentage: Number(values.progressPercentage ?? (values.done ? 100 : 0))
    }, 'progress save');
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
        attempted_at: new Date().toISOString()
      });
      warn('quiz score save', error);
    }));
  }

  async function saveProfile(userId, settings) {
    const client = getClient();
    if (!client || !userId) return;
    await updateOrInsert(TABLES.profiles, { id: userId }, {
      preferred_language: settings.lang,
      text_size: settings.fs,
      voice_enabled: !!settings.voice
    }, 'profile save');
  }

  async function saveReminder(userId, reminderTime) {
    const client = getClient();
    if (!client || !userId || !reminderTime) return;
    await updateOrInsert(TABLES.reminders, { user_id: userId }, {
      reminder_time: reminderTime,
      is_enabled: true
    }, 'reminder save');
  }

  async function recordLearningSession(userId, durationMinutes, startedAt, endedAt) {
    const client = getClient();
    if (!client || !userId) return;
    const { error } = await client.from(TABLES.sessions).insert({
      user_id: userId,
      duration_minutes: Number(durationMinutes),
      started_at: startedAt || new Date().toISOString(),
      completed_at: endedAt || new Date().toISOString()
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
