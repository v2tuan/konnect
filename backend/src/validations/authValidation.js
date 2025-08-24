import Joi from 'joi'
import { PASSWORD_RULE, PASSWORD_RULE_MESSAGE } from '~/utils/validators'

const update = async (req, res, next) => {
  const correctCondition = Joi.object({
    current_password: Joi.string().pattern(PASSWORD_RULE).message(`currentPassword:  ${PASSWORD_RULE_MESSAGE}`),
    new_password: Joi.string().pattern(PASSWORD_RULE).message(`newPassword:  ${PASSWORD_RULE_MESSAGE}`),
    avatarUrl: Joi.string().uri(),
    fullName: Joi.string().min(2).max(100),
    dateOfBirth: Joi.date().iso().less("now").greater("1900-01-01"),
    bio: Joi.string().max(500)
  })
  try {
    await correctCondition.validateAsync( req.body, { abortEarly: false })
    next()
  } catch (error) {
    next(error)
  }
}

export const authValidation = {
  update
}