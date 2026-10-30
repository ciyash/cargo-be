import express from 'express'
import adminAuthRouter from '../modules/admin/admin-auth/admin.auth.route.js'
import productRouter from '../modules/admin/Products/product.route.js'
import employeeRouter from '../modules/admin/add-employee/add.employee.router.js'

const app=express.Router()

app.use("/admin-auth",adminAuthRouter)

app.use("/products",productRouter)

app.use("/employee",employeeRouter)


export default app