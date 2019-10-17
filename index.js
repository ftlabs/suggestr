const dotenv = require('dotenv').config({
	silent: process.env.NODE_ENV === 'production'
});

const package = require('./package.json');
const debug = require('debug')(`${package.name}:index`);
const s3o = require('@financial-times/s3o-middleware');
const express = require('express');
const path = require('path');
const app = express();
const helmet = require('helmet');
const express_enforces_ssl = require('express-enforces-ssl');
const bodyParser = require('body-parser');
const topics = require('./routes/topics');

const PORT = process.env.PORT;
if (!PORT) {
	throw new Error('ERROR: PORT not specified in env');
	return;
}

if (process.env.NODE_ENV === 'production') {
	app.use(helmet());
	app.enable('trust proxy');
	app.use(express_enforces_ssl());
}

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');
app.use('/static', express.static('static'));

// Routes
app.use(s3o);
app.use('/topic', topics);

app.use('/', (req, res) => {
	res.render('index');
});

app.use((err, req, res, next) => {
	console.error(err.stack);
	res.status(500).send('Something broke!');
});

const server = app.listen(PORT, function() {
	console.log('Server is listening on port', PORT);
});

module.exports = server;
