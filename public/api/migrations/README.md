Instructions to create the `jiipeli` database and tables

Options:

1) phpMyAdmin
- Open http://localhost/phpmyadmin
- Click "Import" or "SQL" and paste the contents of `create_jiipeli.sql` (or import the file).

2) mysql CLI (Windows / WSL / Git Bash)

```sh
mysql -u root -p < public/api/migrations/create_jiipeli.sql
```

If your MySQL root user has no password (common with XAMPP), omit `-p`.

After creating the database, reload the forum endpoint at:

`http://localhost/jiipeli/public/api/forum.php`

To create a test post via `curl`:

```sh
curl -X POST -H "Content-Type: application/json" \
  -d '{"title":"Test post","body":"Hello from test","device":"web"}' \
  "http://localhost/jiipeli/public/api/forum.php?action=post"
```

To fetch posts:

```sh
curl "http://localhost/jiipeli/public/api/forum.php"
```
