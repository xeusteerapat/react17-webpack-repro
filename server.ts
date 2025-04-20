import express from 'express';
import cors from 'cors';

const app = express();

app.use(express.json());
app.use(cors());

app.get('/', (req, res) => {
	res.send({
		message: 'Hi',
	});
});

app.get('/me', (req, res, next) => {
	try {
		res.send({
			message: 'Authenticate Success',
		});
	} catch (error) {
		next(error);
	}
});

app.use((err, req, res, next) => {
	console.log(err.message);

	res.send({
		message: 'Internal Server Error',
	});
});

app.listen(4009, () => {
	console.log('server 4009');
});
