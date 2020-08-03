function checkLogin(req, res, next) {
    if (req.user) {
        next();
    } else {
        res.status(403).json({ message: "Necessita de login para efetuar este pedido." })
    }
}

module.exports = checkLogin;