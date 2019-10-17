if (process.env.NODE_ENV !== 'production') require('dotenv').config();

const package = require('./package.json');
const debug = require('debug')(`${package.name}:index`);
const express = require('express');
const path = require('path');
const app = express();
const topics = require('./routes/topics');

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');
app.use('/static', express.static('static'));

// Routes
app.use('/topic', topics);

app.use('/', (req, res) => {
	res.render('index');
});

app.use((err, req, res, next) => {
	console.error(err.stack);
	res.status(500).send('Something broke!');
});

const PORT = process.env.PORT;
if (!PORT) {
	throw new Error('ERROR: PORT not specified in env');
}

const server = app.listen(PORT, function() {
	console.log('Server is listening on port', PORT);
});

module.exports = server;
