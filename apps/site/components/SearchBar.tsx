/**
 * Search.
 *
 * A plain GET form, so it works with JavaScript disabled, on a dead battery
 * saver, and on the mid-range Android over mobile data this site is built for.
 * The browser does the submitting; Postgres does the searching. No client
 * bundle at all.
 */
export function SearchBar({ q = '', compact = false }: { q?: string; compact?: boolean }) {
	return (
		<form className={compact ? 'search search--compact' : 'search'} action="/search" role="search">
			<label className="search__label" htmlFor="q">
				Search openings
			</label>
			<div className="search__row">
				<input
					id="q"
					className="search__input"
					type="search"
					name="q"
					defaultValue={q}
					placeholder="Company, role, city or skill"
					autoComplete="off"
					enterKeyHint="search"
				/>
				<button className="search__go" type="submit">
					Search
				</button>
			</div>
		</form>
	);
}
