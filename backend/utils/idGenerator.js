
const DEFAULT_CONFIG = {
  prefix: '',
  timestampBase: 36,
  timestampUpperCase: true,
  randomLength: 4,
  randomBase: 36,
  randomUpperCase: true,
};

function generateId(config = {}) {
  const {
    prefix,
    timestampBase,
    timestampUpperCase,
    randomLength,
    randomBase,
    randomUpperCase,
  } = { ...DEFAULT_CONFIG, ...config };

  const timestamp = Date.now().toString(timestampBase);
  const formattedTimestamp = timestampUpperCase ? timestamp.toUpperCase() : timestamp;

  let randomStr = '';
  for (let i = 0; i < randomLength; i++) {
    randomStr += Math.floor(Math.random() * randomBase).toString(randomBase);
  }
  const formattedRandom = randomUpperCase ? randomStr.toUpperCase() : randomStr;

  return `${prefix}${formattedTimestamp}${formattedRandom}`;
}

function generateTicketId() {
  return generateId({ prefix: 'TKT', randomLength: 4 });
}

function generateRoleId() {
  return generateId({ 
    prefix: 'role_', 
    timestampUpperCase: false, 
    randomLength: 9, 
    randomUpperCase: false 
  });
}

function generatePlanId() {
  return generateId({ prefix: 'PLAN', randomLength: 4 });
}

function generateTaskId() {
  return generateId({ prefix: 'TASK', randomLength: 4 });
}

function generateRecordId() {
  return generateId({ prefix: 'REC', randomLength: 6 });
}

function generatePendingId() {
  return generateId({ prefix: 'PEND', randomLength: 4 });
}

module.exports = {
  generateId,
  generateTicketId,
  generateRoleId,
  generatePlanId,
  generateTaskId,
  generateRecordId,
  generatePendingId,
  DEFAULT_CONFIG,
};
