from app import create_app, db

app = create_app()

# Ensure we have an application context
app.app_context().push()

if __name__ == '__main__':
    app.run(debug=True, port=5000)