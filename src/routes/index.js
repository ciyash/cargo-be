import express from 'express'
import { domesticPhoneFields } from '../utils/phone.js';
import companyRouter from "./company.router.js"
import adminAuthRouter from './admin.auth.route.js'
import branchRouter from './branch.route.js'
import bookingRouter from './booking.route.js'
import vehicleRouter from './vehicle.route.js'
import parcelLoadingRouter from "./parcel.loading.route.js"
import multiRouter from "./multi.router.js"
import extraChargeRouter from "./extra.charge.route.js"
import parcelUnloadingRouter from "./parcel.unloading.route.js"
import expensiveRouter from "./expensive.route.js"  
import bankRouter from "./bank.route.js"
import itemRouter from "./item.route.js"
import vendorRouter from "./vendor.route.js"  
import branchReportRouter from "./branch.report.route.js"  

//company routes  
import masterRouter from './cf.master.router.js'
import cfExtraChargeRouter from './cf.extra.charge.router.js'
import voucherRouter from './cf.voucher.generate.route.js'

// subadmin data  routes

const app=express.Router()
app.use(domesticPhoneFields);

app.use("/company",companyRouter)
app.use("/subadmin-auth",adminAuthRouter)
app.use("/branch",branchRouter)
app.use("/booking",bookingRouter)
app.use("/vehicle",vehicleRouter) 
app.use("/parcel-loading",parcelLoadingRouter)
app.use("/multi-router",multiRouter)
app.use("/extra-charge",extraChargeRouter)
app.use("/parcel-unloading",parcelUnloadingRouter)  

//cfmaster routes   

app.use("/cfmaster",masterRouter)
app.use("/cfextra-charge",cfExtraChargeRouter)
app.use("/voucher-generate",voucherRouter)
app.use("/expensive",expensiveRouter)  
app.use("/bank",bankRouter)
app.use("/item",itemRouter)
app.use("/vendor",vendorRouter)  

app.use("/branch-report",branchReportRouter)  


export default app                 
