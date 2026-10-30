import express from 'express'
import employeeController from './add.employee.controller.js'

const router=express.Router()

router.post("/register",employeeController.createEmployee)

router.post("/login",employeeController.loginEmployee)

router.post("/change-password",employeeController.changePassword)

router.get("/",employeeController.getAllEmployees)

router.get("/:id",employeeController.getEmployeeById)

router.delete("/:id",employeeController.deleteEmployee)

export default router