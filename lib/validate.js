'use strict';

// Trim, and turn Windows line breaks into \n. Line breaks inside the text stay.
function clean(value) {
  if (typeof value !== 'string') return '';
  return value.replace(/\r\n?/g, '\n').trim();
}

// Returns { value, error }. Used for the username at sign-up and for the nickname later.
function checkUsername(raw, label = 'Username') {
  const value = clean(raw);
  let error = null;
  if (!value) {
    error = `${label} is required.`;
  } else if (value.length < 3 || value.length > 20) {
    error = `${label} must be 3 to 20 characters.`;
  } else if (!/^[A-Za-z0-9_]+$/.test(value)) {
    error = `${label} can only have letters, numbers and underscore.`;
  }
  return { value, error };
}

// Returns { password2: error } style errors for a new password and its repeat.
function checkPassword(rawPassword, rawRepeat) {
  const password = typeof rawPassword === 'string' ? rawPassword : '';
  const repeat = typeof rawRepeat === 'string' ? rawRepeat : '';
  const errors = {};

  if (!password) {
    errors.password = 'Password is required.';
  } else if (password.length < 8 || password.length > 72) {
    errors.password = 'Password must be 8 to 72 characters.';
  } else if (Buffer.byteLength(password, 'utf8') > 72) {
    errors.password = 'Password is too long. Use fewer special characters.';
  } else if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    errors.password = 'Password needs at least one letter and one number.';
  }

  if (!errors.password && password !== repeat) {
    errors.password2 = 'Passwords do not match.';
  }
  return errors;
}

function validateAccount(body) {
  const { value: username, error } = checkUsername(body.username);
  const errors = checkPassword(body.password, body.password2);
  if (error) errors.username = error;
  return { errors, values: { username } };
}

const COMMENT_MAX = 1000;

// Returns { text, error }.
function validateComment(raw) {
  const text = clean(raw);
  if (!text) return { text, error: 'Write a comment first.' };
  if (text.length > COMMENT_MAX) {
    return { text, error: `Comment must be at most ${COMMENT_MAX} characters.` };
  }
  return { text, error: null };
}

// Field rules for the survey. min 0 means the field is optional.
const TEXT_FIELDS = [
  { name: 'name', label: 'Name', min: 3, max: 80, required: true },
  { name: 'description', label: 'Description', min: 20, max: 5000, required: true },
  { name: 'entities', label: 'Entities', min: 10, max: 2000, required: true },
  { name: 'entries', label: 'Entries', min: 10, max: 2000, required: true },
  { name: 'exits', label: 'Exits', min: 10, max: 2000, required: true },
  { name: 'features', label: 'Features', min: 10, max: 3000, required: true },
  { name: 'lovely_places', label: 'Lovely places', min: 0, max: 2000, required: false },
  { name: 'danger_areas', label: 'Danger areas', min: 0, max: 2000, required: false },
  { name: 'music_name', label: 'Level music (name)', min: 0, max: 120, required: false },
];

function validateLevel(body) {
  const errors = {};
  const values = {};

  for (const f of TEXT_FIELDS) {
    const text = clean(body[f.name]);
    values[f.name] = text;
    if (f.required && !text) {
      errors[f.name] = `${f.label} is required.`;
    } else if (text && text.length < f.min) {
      errors[f.name] = `${f.label} must be at least ${f.min} characters.`;
    } else if (text.length > f.max) {
      errors[f.name] = `${f.label} must be at most ${f.max} characters.`;
    }
  }

  const rawNumber = clean(body.level_number);
  values.level_number = rawNumber;
  let levelNumber = null;
  if (rawNumber !== '') {
    if (!/^\d{1,4}$/.test(rawNumber)) {
      errors.level_number = 'Level number must be a whole number from 0 to 9999.';
    } else {
      levelNumber = Number(rawNumber);
    }
  }

  const rawDanger = clean(body.danger_rating);
  values.danger_rating = rawDanger;
  let dangerRating = null;
  if (rawDanger !== '') {
    if (!/^[1-5]$/.test(rawDanger)) {
      errors.danger_rating = 'Danger rating must be a number from 1 to 5.';
    } else {
      dangerRating = Number(rawDanger);
    }
  }

  const data = {
    name: values.name,
    level_number: levelNumber,
    danger_rating: dangerRating,
    description: values.description,
    entities: values.entities,
    entries: values.entries,
    exits: values.exits,
    features: values.features,
    lovely_places: values.lovely_places || null,
    danger_areas: values.danger_areas || null,
    music_name: values.music_name || null,
  };

  return { errors, values, data };
}

module.exports = {
  validateAccount,
  validateLevel,
  validateComment,
  checkUsername,
  checkPassword,
  COMMENT_MAX,
  TEXT_FIELDS,
  clean,
};
