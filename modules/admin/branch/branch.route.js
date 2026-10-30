import express from 'express'
import * as branchController from './branch.controller.js'

const router=express.Router()

router.post("/",branchController.createBranch)

router.get("/:id", branchController.getBranchById)

export default router