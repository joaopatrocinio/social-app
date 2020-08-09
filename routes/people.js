const router = require('express').Router();
const database = require("../database.js")

function searchPeople(req, res) {
	const db = database.getDb()
	const users = db.collection("users")

	users.find({
		email: { // emails containing <req.params.query>
			$regex: req.params.query,
			$options: '^'
		}
	}).toArray((err, results) => {
		if (err) throw err;
		return res.json(results)
	})
}

router.get('/search/:query', searchPeople);

module.exports = router;