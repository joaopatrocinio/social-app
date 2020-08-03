function checkAdmin(req, res, next) {
    if (req.user.userTypeId == 1) {
        next();
    } else {
        res.status(401).json({ message: "Necessita de permissões de admin para fazer este pedido." })
    }
}

module.exports = checkAdmin;