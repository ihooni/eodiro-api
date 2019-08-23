import express from 'express'
import LocaleMiddleware from 'Http/middleware/Locale'
import CheckVendorMiddleware from 'Http/middleware/CheckVendor'
import CampusesController from 'Http/controllers/CampusesController'
import vacantRouter from 'Routes/vacant'
import inquiryRouter from 'Routes/inquiry'

const router = express.Router()

/**
 * Middleware
 */
router.use('/campuses/:vendor', CheckVendorMiddleware.handler())

/**
 * Sub router
 */
router.use('/campuses/:vendor/vacant', vacantRouter)
router.use('/campuses/:vendor/inquiry', inquiryRouter)

/**
 * Controller
 */
// show campus list
router.get('/campuses', LocaleMiddleware.handler(), CampusesController.index())

// router.get('/test', (req, res) => {
//   LogHelper.log('info', 'logger test')
//
//   res.json({
//     result: 'good'
//   })
// })

export default router
