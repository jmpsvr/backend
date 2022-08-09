export default (error, req, res, next) => {
  if (error instanceof SyntaxError) {
    res.status(400).json({ 
      code: -1,
      message: 'Bad request',
      type: 'error'
    });
  } else {
    next();
  }
}