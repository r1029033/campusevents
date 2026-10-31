const formatIssues = (issues, source) =>
  issues.map((issue) => ({
    field: issue.path.join('.') || source,
    message: issue.message
  }));

export function validate(schema, source) {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: formatIssues(result.error.issues, source)
        }
      });
    }

    req.validated = req.validated ?? {};
    req.validated[source] = result.data;
    next();
  };
}