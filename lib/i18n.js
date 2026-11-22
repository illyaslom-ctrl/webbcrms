'use strict';

// Two languages: English (the source text) and Russian.
// English text is the key. Anything missing from the Russian list shows in English.
// User-written content (levels, comments) is never translated.

const LANGS = ['en', 'ru'];
const DEFAULT_LANG = 'en';

// English text for the few keys that are not plain English sentences.
const en = {
  'comment.login_prefix': 'Log in',
  'comment.or': 'or',
  'comment.register': 'create an account',
  'comment.login_suffix': 'to write a comment.',
  'noaccount.prefix': 'No account?',
  'noaccount.link': 'Create one',
  'haveaccount.prefix': 'Already have an account?',
  'haveaccount.link': 'Log in',
};

const ru = {
  // Header and shared
  Forum: 'Форум',
  'New level': 'Новый уровень',
  'My levels': 'Мои уровни',
  'Log in': 'Войти',
  'Log out': 'Выйти',
  'Create account': 'Создать аккаунт',
  Main: 'Главное меню',
  Language: 'Язык',
  Cancel: 'Отмена',
  Remove: 'Убрать',
  Delete: 'Удалить',
  Edit: 'Изменить',
  or: 'или',
  'Please fix the following:': 'Пожалуйста, исправьте:',
  'Continue with Google': 'Продолжить через Google',

  // Error pages
  'Page not found': 'Страница не найдена',
  'We could not find that page.': 'Мы не нашли такую страницу.',
  'Back to levels': 'Назад к уровням',
  'Something went wrong': 'Что-то пошло не так',
  'Something went wrong. Please try again.': 'Что-то пошло не так. Попробуйте ещё раз.',
  'Your form has expired. Please go back, reload the page and try again.':
    'Форма устарела. Вернитесь назад, обновите страницу и попробуйте ещё раз.',

  // Login and register
  Username: 'Имя пользователя',
  Password: 'Пароль',
  'Repeat password': 'Повторите пароль',
  '3 to 20 characters: letters, numbers and underscore.': 'От 3 до 20 символов: латинские буквы, цифры и подчёркивание.',
  '8 to 72 characters, with at least one letter and one number.': 'От 8 до 72 символов, минимум одна буква и одна цифра.',
  'Too many attempts. Try again in 15 minutes.': 'Слишком много попыток. Попробуйте снова через 15 минут.',
  'Wrong username or password.': 'Неверное имя пользователя или пароль.',
  'Username is already taken.': 'Это имя пользователя уже занято.',
  'Nickname is already taken.': 'Этот никнейм уже занят.',
  'comment.login_prefix': 'Войдите',
  'comment.or': 'или',
  'comment.register': 'создайте аккаунт',
  'comment.login_suffix': ', чтобы написать комментарий.',
  'noaccount.prefix': 'Нет аккаунта?',
  'noaccount.link': 'Создайте его',
  'haveaccount.prefix': 'Уже есть аккаунт?',
  'haveaccount.link': 'Войти',
  'Google sign-in was cancelled.': 'Вход через Google отменён.',
  'Google sign-in failed. Please try again.': 'Не удалось войти через Google. Попробуйте ещё раз.',
  'Your Google email address is not verified.': 'Ваш адрес почты Google не подтверждён.',

  // Forum
  Levels: 'Уровни',
  'Search by level name': 'Поиск по названию уровня',
  Search: 'Поиск',
  'Nothing found for {q}.': 'По запросу «{q}» ничего не найдено.',
  'No levels yet. Be the first to publish one.': 'Уровней пока нет. Станьте первым, кто опубликует уровень.',
  'You have not published any levels yet.': 'Вы ещё не опубликовали ни одного уровня.',
  Previous: 'Назад',
  Next: 'Далее',
  Pages: 'Страницы',
  'Page {page} of {pages}': 'Страница {page} из {pages}',
  'No photo': 'Нет фото',
  'Level {n}': 'Уровень {n}',
  'by {name}, {date}': 'автор: {name}, {date}',
  'Danger: {n} / 5': 'Опасность: {n} / 5',
  '{name} photo {n}': '{name}, фото {n}',

  // Level page
  Photos: 'Фотографии',
  Music: 'Музыка',
  Description: 'Описание',
  Entities: 'Существа',
  Entries: 'Входы',
  Exits: 'Выходы',
  Features: 'Особенности',
  'Lovely places': 'Приятные места',
  'Danger areas': 'Опасные зоны',
  'Delete this level? This cannot be undone.': 'Удалить этот уровень? Это нельзя отменить.',
  'Comments ({n})': 'Комментарии ({n})',
  'No comments yet.': 'Комментариев пока нет.',
  'Delete this comment?': 'Удалить этот комментарий?',
  'Add a comment': 'Добавить комментарий',
  'Post comment': 'Отправить комментарий',
  Comment: 'Комментарий',
  'Comment posted.': 'Комментарий отправлен.',
  'Comment deleted.': 'Комментарий удалён.',
  'You are commenting too fast. Please wait a few minutes.': 'Вы комментируете слишком часто. Подождите несколько минут.',
  'Write a comment first.': 'Сначала напишите комментарий.',
  'Level published.': 'Уровень опубликован.',
  'Changes saved.': 'Изменения сохранены.',
  'Level deleted.': 'Уровень удалён.',

  // Level form
  'Edit level': 'Изменить уровень',
  'Describe your level. Fields marked with * are required.': 'Опишите свой уровень. Поля со звёздочкой * обязательны.',
  'Save changes': 'Сохранить изменения',
  'Publish level': 'Опубликовать уровень',
  Name: 'Название',
  'The name of your level.': 'Название вашего уровня.',
  'Level number': 'Номер уровня',
  'For example 0, 1, 37. Leave empty if your level has no number.': 'Например 0, 1, 37. Оставьте пустым, если у уровня нет номера.',
  'Danger rating': 'Уровень опасности',
  '1 means calm, 5 means very dangerous.': '1 — спокойно, 5 — очень опасно.',
  'Not set': 'Не указано',
  'Describe your level in your own words: what it looks like, what it feels like.': 'Опишите уровень своими словами: как он выглядит и какие ощущения вызывает.',
  'Creatures, beings or things that live in or move through the level.': 'Существа и объекты, которые живут на уровне или перемещаются по нему.',
  'How a person can get into this level.': 'Как человек может попасть на этот уровень.',
  'How a person can leave this level.': 'Как человек может покинуть этот уровень.',
  'Rooms, materials, lights, sounds, smells, rules of the level.': 'Комнаты, материалы, свет, звуки, запахи, правила уровня.',
  'Places that are safe or pleasant to rest in.': 'Места, где безопасно или приятно отдыхать.',
  'Places to avoid and why.': 'Места, которых стоит избегать, и почему.',
  'Level music (name)': 'Музыка уровня (название)',
  'Name of a song or track that fits the level. Optional.': 'Название песни или трека, подходящего уровню. Необязательно.',
  'Level music (upload)': 'Музыка уровня (файл)',
  'Upload an audio file: MP3, OGG or WAV, up to 15 MB. Optional.': 'Загрузите аудиофайл: MP3, OGG или WAV, до 15 МБ. Необязательно.',
  'A music file is already saved. Choosing a new file replaces it.': 'Музыкальный файл уже сохранён. Новый файл его заменит.',
  'Up to 10 photos. Images only: JPG, PNG or WebP, up to 8 MB each. No videos. The first photo is the cover.':
    'До 10 фотографий. Только изображения: JPG, PNG или WebP, до 8 МБ каждое. Видео нельзя. Первая фотография станет обложкой.',
  'You can have at most 10 photos in total.': 'Всего может быть не больше 10 фотографий.',
  '{n} of 10 photos selected': 'Выбрано фото: {n} из 10',
  'You can upload up to 10 photos.': 'Можно загрузить не больше 10 фотографий.',
  'Please select your photos again.': 'Пожалуйста, выберите фотографии ещё раз.',

  // Account
  Account: 'Аккаунт',
  'Profile picture': 'Фото профиля',
  'Your profile picture': 'Ваше фото профиля',
  'Choose a picture': 'Выберите изображение',
  'JPG, PNG or WebP, up to 2 MB.': 'JPG, PNG или WebP, до 2 МБ.',
  'Save picture': 'Сохранить фото',
  'Remove picture': 'Убрать фото',
  Nickname: 'Никнейм',
  'This is also the name you log in with.': 'Это же имя используется для входа.',
  'Save nickname': 'Сохранить никнейм',
  'Current password': 'Текущий пароль',
  'New password': 'Новый пароль',
  'Repeat new password': 'Повторите новый пароль',
  'Change password': 'Сменить пароль',
  'You sign in with Google, so there is no password to change.': 'Вы входите через Google, поэтому пароля для смены нет.',
  'Delete account': 'Удалить аккаунт',
  'This deletes your account, your levels, their photos and music, and your comments. It cannot be undone.':
    'Будут удалены ваш аккаунт, ваши уровни, их фото и музыка, а также ваши комментарии. Это нельзя отменить.',
  'Type your nickname ({name}) to confirm': 'Введите свой никнейм ({name}) для подтверждения',
  'Delete your account? This cannot be undone.': 'Удалить аккаунт? Это нельзя отменить.',
  'Delete my account': 'Удалить мой аккаунт',
  'Nickname saved.': 'Никнейм сохранён.',
  'Picture saved.': 'Фото сохранено.',
  'Picture removed.': 'Фото убрано.',
  'Password changed.': 'Пароль изменён.',
  'The picture must be 2 MB or smaller.': 'Изображение должно быть не больше 2 МБ.',
  'Choose a picture first.': 'Сначала выберите изображение.',
  'The upload failed. Please try again.': 'Не удалось загрузить файл. Попробуйте ещё раз.',
  'Your current password is not correct.': 'Текущий пароль неверный.',
  'Type your nickname exactly to delete your account.': 'Чтобы удалить аккаунт, точно введите свой никнейм.',

  // File checks
  'Videos are not allowed. Upload images only.': 'Видео нельзя. Загружайте только изображения.',
  'This file is not a valid image': 'Этот файл не является изображением',
  'This file is not a valid audio file': 'Этот файл не является аудиофайлом',
  'Each photo must be 8 MB or smaller.': 'Каждая фотография должна быть не больше 8 МБ.',
  'The music file must be 15 MB or smaller.': 'Музыкальный файл должен быть не больше 15 МБ.',

  // Other validation messages
  'Password is required.': 'Введите пароль.',
  'Password must be 8 to 72 characters.': 'Пароль должен содержать от 8 до 72 символов.',
  'Password is too long. Use fewer special characters.': 'Пароль слишком длинный. Используйте меньше специальных символов.',
  'Password needs at least one letter and one number.': 'В пароле нужна минимум одна буква и одна цифра.',
  'Passwords do not match.': 'Пароли не совпадают.',
  'Level number must be a whole number from 0 to 9999.': 'Номер уровня должен быть целым числом от 0 до 9999.',
  'Danger rating must be a number from 1 to 5.': 'Уровень опасности должен быть числом от 1 до 5.',
};

// Messages with a field name or a number inside: "<label> is required." and so on.
const patterns = [
  [/^(.+) is required\.$/, (m, t) => `Поле «${t(m[1])}» обязательно.`],
  [/^(.+) must be 3 to 20 characters\.$/, (m, t) => `Поле «${t(m[1])}» должно содержать от 3 до 20 символов.`],
  [
    /^(.+) can only have letters, numbers and underscore\.$/,
    (m, t) => `Поле «${t(m[1])}»: допустимы только латинские буквы, цифры и подчёркивание.`,
  ],
  [/^(.+) must be at least (\d+) characters\.$/, (m, t) => `Поле «${t(m[1])}» должно содержать не меньше ${m[2]} символов.`],
  [/^(.+) must be at most (\d+) characters\.$/, (m, t) => `Поле «${t(m[1])}» должно содержать не больше ${m[2]} символов.`],
];

const RU_MONTHS = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
const EN_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function fill(text, params) {
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (all, key) => (key in params ? String(params[key]) : all));
}

function makeT(lang) {
  const t = function t(key, params) {
    if (typeof key !== 'string') return key;
    let text;
    if (lang === 'ru') {
      text = ru[key];
      if (text === undefined) {
        for (const [re, build] of patterns) {
          const m = key.match(re);
          if (m) {
            text = build(m, t);
            break;
          }
        }
      }
    } else {
      text = en[key];
    }
    return fill(text === undefined ? key : text, params);
  };
  return t;
}

function formatDate(lang, value) {
  const d = new Date(String(value).replace(' ', 'T') + 'Z');
  const months = lang === 'ru' ? RU_MONTHS : EN_MONTHS;
  return `${d.getUTCDate()} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

function readCookie(req, name) {
  const header = req.headers.cookie;
  if (!header) return null;
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim());
  }
  return null;
}

// Sets req.lang, res.locals.lang, res.locals.t and the date formatter.
function middleware(req, res, next) {
  const saved = readCookie(req, 'lang');
  const lang = LANGS.includes(saved) ? saved : DEFAULT_LANG;
  req.lang = lang;
  res.locals.lang = lang;
  res.locals.t = makeT(lang);
  res.locals.formatDate = (value) => formatDate(lang, value);
  // Where the language switch should come back to. Pages that only answer a POST go to the forum.
  const postBack = ['/login', '/register'];
  res.locals.currentUrl =
    req.method === 'GET' ? req.originalUrl : postBack.includes(req.path) ? req.path : '/levels';
  next();
}

// Only same-site paths, so the switch cannot be used as an open redirect.
function safeNext(value) {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) {
    return '/levels';
  }
  return value;
}

module.exports = { LANGS, middleware, makeT, safeNext };
