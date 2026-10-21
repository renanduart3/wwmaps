"""Read-only QA of the files downloaded by tests/browser/comparison.cua.mjs.
Requires pypdf; use the Codex bundled Python runtime when available.
"""
import csv
import json
from pathlib import Path
from xml.etree import ElementTree
from pypdf import PdfReader

root = Path(__file__).resolve().parent.parent
directory = root / 'output/comparison-checks'
payload = json.loads((directory / 'comparison-pt-BR.json').read_text(encoding='utf-8'))
data = json.loads((root / 'datasets/indicators.json').read_text(encoding='utf-8'))
countries = {country['iso3']: country['id'] for country in data['countries']}
metrics = {metric['id']: metric for metric in data['indicators']}
assert payload['mode'] == 'mock' and payload['locale'] == 'pt-BR'
assert len(payload['rows']) == 450
for row in payload['rows']:
    expected = metrics[row['indicator']]['values'][countries[row['country']]][data['years'].index(row['year'])]
    assert row['value'] == expected, row
    assert row['source_role'] == 'planned-reference'
    assert row['source'] == metrics[row['indicator']]['source']['url']
with (directory / 'comparison-pt-BR.csv').open(encoding='utf-8-sig', newline='') as stream:
    rows = list(csv.DictReader(stream))
assert len(rows) == 450
for csv_row, json_row in zip(rows, payload['rows']):
    assert csv_row['country'] == json_row['country']
    assert csv_row['indicator'] == json_row['indicator']
    assert csv_row['year'] == str(json_row['year'])
    assert csv_row['source'] == json_row['source']
    assert (float(csv_row['value']) if csv_row['value'] else None) == json_row['value']
svg = ElementTree.parse(directory / 'comparison-pt-BR.svg').getroot()
assert int(svg.attrib['width']) == 1440
assert (directory / 'comparison-pt-BR.png').read_bytes()[:8] == b'\x89PNG\r\n\x1a\n'
pdf = PdfReader(directory / 'comparison-pt-BR.pdf')
assert len(pdf.pages) == 6
for page, metric in zip(pdf.pages, data['indicators']):
    text = page.extract_text()
    assert metric['source']['url'] in text
    assert 'sintéticos' in text and '2015' in text and '2010' in text and '2024' in text
    assert 'WWMAPS.COM' in text
    # Native text must stay inside the printable page. Charts are reviewed separately as images.
    w, h = float(page.mediabox.width), float(page.mediabox.height)
    def visitor(text, cm, tm, font, size):
        if text.strip():
            assert 0 <= tm[4] <= w and 0 <= tm[5] <= h, (text, tm)
    page.extract_text(visitor_text=visitor)
print('Verified: 450 JSON/CSV rows against the active dataset, valid SVG/PNG, 6 PDF pages, sources, notices and native text positions.')
