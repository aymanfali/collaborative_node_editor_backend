export const getIndex = (req, res) => {
  // req.user comes from authMiddleware
  res.json({
    success: true,
    data: {
      message: "This the main route",
      user: req.user,
    },
  });
};
