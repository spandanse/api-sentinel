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

module.exports = {
  Scan,
  Finding,
  User,
};
