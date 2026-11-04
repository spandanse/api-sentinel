const Scan = require('./scan.model');
const Finding = require('./finding.model');
const User = require('./user.model');

Scan.hasMany(Finding, {
  foreignKey: 'scanId',
  as: 'findings',
  onDelete: 'CASCADE',
});

Finding.belongsTo(Scan, {
  foreignKey: 'scanId',
  as: 'scan',
});

Scan.belongsTo(User, {
  foreignKey: 'userId',
  as: 'owner',
  onDelete: 'SET NULL',
});

User.hasMany(Scan, {
  foreignKey: 'userId',
  as: 'scans',
  onDelete: 'SET NULL',
});

module.exports = {
  Scan,
  Finding,
  User,
};
