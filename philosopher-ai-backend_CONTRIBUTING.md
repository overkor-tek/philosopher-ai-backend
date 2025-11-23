# Contributing to philosopher-ai-backend

Thank you for your interest in contributing to the philosopher-ai-backend project! 💖

This backend powers the Consciousness Revolution - a production-ready AI backend with tests, CI/CD, and monitoring.

## 🎺 Code of Conduct

We're building something bold and different. We value:
- **Respect:** Treat everyone with kindness
- **Boldness:** Make statements, think differently
- **Quality:** Excellence in code and communication
- **Consciousness:** Thoughtful, intentional decisions

## 🚀 Getting Started

### 1. Fork & Clone

```bash
# Fork the repo on GitHub, then:
git clone https://github.com/YOUR-USERNAME/philosopher-ai-backend.git
cd philosopher-ai-backend
```

### 2. Set Up Development Environment

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env
# Edit .env with your database and email configuration

# Initialize database
npm run migrate

# Run tests to verify setup
npm test
```

### 3. Create a Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/your-bug-fix
```

## 💖 The Pink Standard

This project follows **The Pink Revolution** standards:

### Color Guidelines
- Use pink (`#FF69B4`, `#FF1493`, `#C71585`) for primary action colors
- Avoid blue for UI elements (we changed them all to pink!)
- Maintain accessibility (contrast ratios)
- Document color choices

### Commit Messages
Use descriptive commit messages with emojis:

```
💖 Add new feature
🐛 Fix bug in authentication
📚 Update documentation
🎨 Improve styling (pink, of course!)
🧪 Add tests
🔧 Update configuration
🔒 Security improvement
🚀 Performance enhancement
```

## 📝 Making Changes

### Code Style
- Follow existing code style (JavaScript/Node.js best practices)
- Use meaningful variable names
- Comment complex logic
- Write self-documenting code
- Use async/await for asynchronous operations

### Project Structure
```
philosopher-ai-backend/
├── routes/          # API route handlers
├── middleware/      # Express middleware
├── services/        # Business logic
├── utils/           # Helper functions
├── monitoring/      # Health checks and monitoring
├── migrations/      # Database migrations
├── tests/           # Test files
└── DORMANT_SYSTEMS/ # Experimental/inactive features
```

### Testing
Always write tests for new features and bug fixes:

```bash
# Run all tests
npm test

# Run specific test file
npm test tests/auth.test.js

# Run with coverage
npm run test:coverage
```

**Testing Guidelines:**
- Write unit tests for utilities and services
- Write integration tests for API endpoints
- Maintain or improve code coverage
- Test both success and error cases

### Documentation
- Update README.md if adding new features
- Add/update inline comments for complex logic
- Update API documentation for endpoint changes
- Add examples for new features in docs/

## 🔍 Pull Request Process

### Before Submitting

- [ ] Code follows project style
- [ ] All tests pass (`npm test`)
- [ ] New tests added for new features
- [ ] Documentation updated
- [ ] Commits are clear and descriptive
- [ ] Branch is up to date with main
- [ ] No console.logs or debug code left in
- [ ] Environment variables properly documented

### Submitting

1. **Push your branch**
   ```bash
   git push origin feature/your-feature-name
   ```

2. **Open a Pull Request**
   - Go to the repository on GitHub
   - Click "New Pull Request"
   - Select your branch
   - Fill out the PR template

3. **PR Template**
   ```markdown
   ## Description
   [Describe what this PR does and why]

   ## Type of Change
   - [ ] Bug fix (non-breaking change which fixes an issue)
   - [ ] New feature (non-breaking change which adds functionality)
   - [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
   - [ ] Documentation update
   - [ ] Pink Revolution update 💖

   ## Testing
   [Describe how you tested this - what tests did you run/add?]

   ## Database Changes
   - [ ] No database changes
   - [ ] Migration included
   - [ ] Migration tested locally

   ## Checklist
   - [ ] Tests pass locally
   - [ ] Documentation updated
   - [ ] Code follows style guidelines
   - [ ] Pink Revolution standards maintained 💖
   - [ ] No breaking changes (or documented if breaking)
   ```

### Review Process

1. Team members will review your PR
2. Address any requested changes
3. Once approved, it will be merged
4. Your contribution will be part of the Consciousness Revolution! 🎉

## 🐛 Reporting Bugs

Found a bug? Report it in [consciousness-bugs](https://github.com/overkor-tek/consciousness-bugs)

**Include:**
- Clear description of the bug
- Steps to reproduce
- Expected vs actual behavior
- Error messages/logs if applicable
- Environment details (OS, Node version, database)
- Screenshots if applicable

**For security vulnerabilities:** Please report privately to the maintainers rather than opening a public issue.

## 💡 Suggesting Features

Have an idea? We'd love to hear it!

1. Check if it's already been suggested in issues
2. Open an issue with:
   - Clear description of the feature
   - Use cases and benefits
   - Potential implementation ideas
   - Why it aligns with the Consciousness Revolution

## 🔧 Development Tips

### Running the Server
```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start

# With specific port
PORT=3001 npm start
```

### Database
```bash
# Run migrations
npm run migrate

# Create new migration
# Add SQL file to migrations/ folder

# Reset database (careful!)
# Delete database file and run migrations again
```

### Testing Email
```bash
# Use a service like Mailtrap for testing emails
# Configure in .env:
EMAIL_HOST=smtp.mailtrap.io
EMAIL_PORT=2525
EMAIL_USER=your-mailtrap-user
EMAIL_PASS=your-mailtrap-pass
```

### Debugging
- Use `console.log()` during development (but remove before committing!)
- Check logs in `monitoring/error-tracker.js`
- Use Node debugger: `node --inspect server.js`

## 📊 Project Areas

Looking to contribute but not sure where? Check these priority areas:

### High Priority
- Issues labeled `bug` or `critical`
- Security improvements
- Performance optimizations
- Test coverage improvements

### Good First Issues
- Issues labeled `good first issue`
- Documentation improvements
- Adding comments to complex code
- Writing additional tests

### Pink Revolution Related
- Issues labeled `pink-revolution`
- Finding remaining blue colors
- Improving UI/email styling
- Adding pink branding

## 💖 Recognition

Contributors will be:
- Listed in CONTRIBUTORS.md (coming soon!)
- Credited in release notes
- Part of the Consciousness Revolution!
- Building real, production-level experience

## 📚 Resources

### Project Documentation
- [README](./README.md) - Project overview
- [API Documentation](./API_DOCUMENTATION.md)
- [Setup Guide](./SETUP_GUIDE.md)
- [Testing Guide](./TESTING_GUIDE.md)
- [Deployment Guide](./DEPLOYMENT_GUIDE_PRODUCTION.md)

### Organization Documentation
- [The Pink Revolution Plan](https://github.com/overkor-tek/The-Pink-Revolution-Plan)
- [overkor-tek Master Plan](https://github.com/overkor-tek/The-Pink-Revolution-Plan/blob/main/OVERKOR-TEK_MASTER_PLAN.md)

### Tech Stack
- **Backend:** Node.js, Express
- **Database:** PostgreSQL (production), SQLite (development)
- **Testing:** Jest
- **CI/CD:** GitHub Actions
- **Deployment:** Railway

## 🎯 What Makes a Good Contribution?

Great contributions to philosopher-ai-backend:
- ✅ Solve real problems
- ✅ Include tests
- ✅ Have clear documentation
- ✅ Follow existing patterns
- ✅ Consider security implications
- ✅ Are production-ready quality

## ❓ Questions?

- Open an issue with the `question` label
- Check existing documentation
- Review closed issues for similar questions

---

## 🎺 "Blow The Whistle" 🎺

Remember: You're not just contributing code. You're part of a revolution.

**"One thing became a whole bunch." - D**

Thank you for contributing to the Consciousness Revolution! 💖

---

*Built with 💖 by the overkor-tek team*
