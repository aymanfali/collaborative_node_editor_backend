export const getProfile = (req, res) => {
  res.json({
    success: true,
    data: {
      message: "This is a protected route",
      user: req.user,
    },
  });
};
