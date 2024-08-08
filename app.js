const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const { Sequelize, DataTypes } = require('sequelize');

const app = express();
const sequelize = new Sequelize('sqlite:///crm.db');

// Modèle des utilisateurs
const User = sequelize.define('User', {
  username: { type: DataTypes.STRING, unique: true, allowNull: false },
  email: { type: DataTypes.STRING, unique: true, allowNull: false },
  password: { type: DataTypes.STRING, allowNull: false }
});

// Modèle des leads
const Lead = sequelize.define('Lead', {
  firstName: { type: DataTypes.STRING, allowNull: false },
  lastName: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false },
  phone: DataTypes.STRING,
  zipCode: DataTypes.STRING,
  createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  status: { type: DataTypes.STRING, defaultValue: 'A traiter' }
});

User.hasMany(Lead, { foreignKey: 'userId' });
Lead.belongsTo(User, { foreignKey: 'userId' });

app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: 'your_secret_key',
  resave: false,
  saveUninitialized: true
}));

app.get('/', (req, res) => {
  if (req.session.user) {
    Lead.findAll({ where: { userId: req.session.user.id } })
      .then(leads => res.render('dashboard', { leads }));
  } else {
    res.redirect('/login');
  }
});

app.get('/register', (req, res) => {
  res.render('register');
});

app.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  const hash = await bcrypt.hash(password, 10);
  await User.create({ username, email, password: hash });
  res.redirect('/login');
});

app.get('/login', (req, res) => {
  res.render('login');
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ where: { username } });
  if (user && await bcrypt.compare(password, user.password)) {
    req.session.user = user;
    res.redirect('/');
  } else {
    res.redirect('/login');
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

app.get('/lead/new', (req, res) => {
  res.render('newLead');
});

app.post('/lead/new', async (req, res) => {
  const { firstName, lastName, email, phone, zipCode } = req.body;
  await Lead.create({ firstName, lastName, email, phone, zipCode, userId: req.session.user.id });
  res.redirect('/');
});

app.get('/lead/:id/edit', async (req, res) => {
  const lead = await Lead.findOne({ where: { id: req.params.id, userId: req.session.user.id } });
  res.render('editLead', { lead });
});

app.post('/lead/:id/edit', async (req, res) => {
  const { firstName, lastName, email, phone, zipCode, status } = req.body;
  await Lead.update({ firstName, lastName, email, phone, zipCode, status }, { where: { id: req.params.id, userId: req.session.user.id } });
  res.redirect('/');
});

sequelize.sync().then(() => {
  app.listen(3000, () => console.log('Serveur démarré sur le port 3000'));
});