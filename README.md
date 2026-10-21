# SEO Content Operations with n8n and Trello

Three portfolio-safe n8n workflows coordinate an article pipeline across a master spreadsheet, destination editorial calendars, a writer log, and Trello. This is a generic adaptation of a private working process. It does **not** write articles or publish them to a website.

## Workflow sequence

| Workflow | Purpose |
| --- | --- |
| `workflows/prepare-and-sync-articles.json` | Finds rows marked `Ready to assign`, assigns stable article IDs, and syncs the agency or direct calendar and writer log. |
| `workflows/assign-articles-to-trello.json` | Creates or recovers a Trello card only after the calendar and writer log are marked `Synced`; records the card ID in the master sheet. |
| `workflows/close-published-articles.json` | When an editor marks a master row `Published` and supplies a URL and publication date, updates the destination calendar and writer log, then moves its Trello card to Published. |

All three exports have manual triggers. Their weekly schedules are disabled until you activate each imported workflow. The sample schedules run on Tuesdays at 10:10, 10:15, and 10:20 **UTC** respectively; adjust the time zone and times for your environment. Run them in order, allowing each run to finish before the next starts.

## Demo data contract

`examples/account-config.json` contains fictional `agency` and `direct` account rows. `examples/article-control.json` illustrates the article row before processing. Use the English column names in these examples when you create your own sheets. The `account_id` supplies a generic prefix for an ID such as `SEO-2026-10-EXAMPLESTORE-01`.

The master spreadsheet needs `account_config` and `article_control` tabs. The separate writer log uses a `writer_log` tab. The account configuration's `destination_spreadsheet_id` points to a calendar you control. Agency calendars use account sections and monthly tabs named `BLOG POSTS - OCT26` in this demo; direct calendars use the configured `destination_sheet`. Agency rows processed in one run must use the same destination spreadsheet and monthly tab. The agency calendar nodes expect headers on row 2 and data from row 3; the writer log expects headers on row 3 and data from row 4. Adapt those node settings to your actual sheet layout. The examples show the input contract, not a ready-made spreadsheet template.

The workflow checks and writes the exact status values `Ready to assign`, `In process`, `Published`, `Pending`, and `Synced`. The editor must supply the publication URL and `actual_publication_date` before the close workflow runs. The private exports used two different calendar-sync column names; this template uses `calendar_sync` consistently across all three workflows.

## Import and configure

1. Import the three JSON files into n8n. They are disabled by default and were adapted from n8n 2.17.3 exports.
2. Replace `YOUR_MASTER_SPREADSHEET_ID` and `YOUR_WRITER_LOG_SPREADSHEET_ID` in the Google Sheets nodes. Assign your own Google Sheets OAuth credential. Set the account configuration rows to real destination spreadsheet IDs **in your private sheets only**.
3. Replace `YOUR_TRELLO_BOARD_ID`, `YOUR_TRELLO_IN_PROCESS_LIST_ID`, `YOUR_TRELLO_PUBLISHED_LIST_ID`, and `YOUR_TRELLO_MEMBER_ID`. Set `trello_label_id` in your private account configuration. Assign your own Trello credential to the Trello nodes and the HTTP search node.
4. Check every Google Sheets node's mapped columns and header rows against the sheets you created. The exported mapping schemas describe the example columns; n8n may ask you to refresh mappings after changing spreadsheet IDs.
5. Use manual runs with a disposable example row. Check the master record, destination calendar, writer log, and Trello card before enabling schedules. The Trello search prevents a second card for the same article ID; sheet operations depend on unique `article_id` values in your sheets.

The preparation workflow updates a master row by its `topic` before the article ID exists. Keep topics unique within the data it reads, or change that match to a stable key in your own setup.

## Privacy and limits

- No client domains, real spreadsheet IDs, Trello board/list/member IDs, private credentials, execution history, or staff names are included.
- The examples are fictional and must not be interpreted as measured performance or completed client work.
- The exports are structurally checked and the key code paths were exercised with synthetic rows. Google Sheets and Trello integrations have not been run live with this public configuration.
- Keep real account rows, editorial calendars, payment details, credentials, and article content out of the repository.
