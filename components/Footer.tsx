export function Footer() {
  return (
    <footer className="border-t border-[hsl(var(--border))] bg-[hsl(var(--background))]">
      <div className="editorial-container py-8 text-sm text-[hsl(var(--text-muted))]">
        <p>
          Annotated is a companion platform for exploring, sharing, and discussing annotations across the web.
        </p>
        <div className="mt-6 pt-6 border-t border-[hsl(var(--border))] flex flex-col sm:flex-row justify-between gap-4">
          <p>&copy; {new Date().getFullYear()} Annotated. All rights reserved.</p>
          <div className="flex gap-4">
            <a href="/privacy" className="hover:text-[hsl(var(--foreground))] transition-colors">
              Privacy Policy
            </a>
            <a href="https://github.com/mcpmessenger/annotated" target="_blank" className="hover:text-[hsl(var(--foreground))] transition-colors">
              GitHub
            </a>
            <a href="mailto:magnetarsenti@gmail.com" className="hover:text-[hsl(var(--foreground))] transition-colors">
              Contact
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
