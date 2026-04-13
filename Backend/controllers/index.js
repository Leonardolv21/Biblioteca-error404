module.exports = (app, db) => {
    require('../admin.controller')(app)(db)
    require('./auth.controller')(app)(db)
    require('./book.controller')(app)(db)
    require('./loan.controller')(app)(db)
    require('./reservation.controller')(app)(db)
    require('./user.controller')(app)(db)

}
