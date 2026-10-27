const users = [
  {
    id: 1,
    name: 'Alice Example',
    email: 'alice@example.test',
    role: 'user',
  },
  {
    id: 2,
    name: 'Bob Example',
    email: 'bob@example.test',
    role: 'user',
  },
  {
    id: 3,
    name: 'Admin Example',
    email: 'admin@example.test',
    role: 'admin',
  },
];

// Synthetic credentials and fixed tokens for local security testing only.
const accounts = [
  {
    username: 'alice',
    password: 'alice-test-123',
    userId: 1,
    token: 'test-token-alice',
  },
  {
    username: 'bob',
    password: 'bob-test-123',
    userId: 2,
    token: 'test-token-bob',
  },
  {
    username: 'admin',
    password: 'admin-test-123',
    userId: 3,
    token: 'test-token-admin',
  },
];

const findUserById = (id) => users.find((user) => user.id === Number(id));

const findAccount = (username, password) =>
  accounts.find(
    (account) =>
      account.username === username && account.password === password
  );

const findAccountByToken = (token) =>
  accounts.find((account) => account.token === token);

module.exports = {
  users,
  findUserById,
  findAccount,
  findAccountByToken,
};
