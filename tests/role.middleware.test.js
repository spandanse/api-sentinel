const requireRole = require('../src/middleware/role.middleware');

describe('Role authorization middleware', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    req = {};
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
  });

  test('rejects requests without an authenticated user', () => {
    const middleware = requireRole('admin');

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Authentication required.',
      message: 'Please log in to access this resource.',
    });
    expect(next).not.toHaveBeenCalled();
  });

  test('rejects a normal user from an admin-only resource', () => {
    req.user = { id: 'user-1', role: 'user' };

    const middleware = requireRole('admin');
    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Access forbidden.',
      message: 'You do not have permission to access this resource.',
    });
    expect(next).not.toHaveBeenCalled();
  });

  test('allows an admin to access an admin-only resource', () => {
    req.user = { id: 'admin-1', role: 'admin' };

    const middleware = requireRole('admin');
    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  test('allows any explicitly permitted role', () => {
    req.user = { id: 'user-1', role: 'user' };

    const middleware = requireRole('user', 'admin');
    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  test('rejects an empty allowed-role configuration', () => {
    expect(() => requireRole()).toThrow(
      'requireRole must receive one or more valid roles.'
    );
  });

  test('rejects an unsupported role configuration', () => {
    expect(() => requireRole('superadmin')).toThrow(
      'requireRole must receive one or more valid roles.'
    );
  });
});
