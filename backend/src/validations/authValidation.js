import Joi from 'joi'

const update = async (req, res, next) => {
  const correctCondition = Joi.object({
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