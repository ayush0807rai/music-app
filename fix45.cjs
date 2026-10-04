const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

const regexUI = /\{selectedArtist \?\ \(\r?\n\s+<div style=\{\{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px", paddingLeft: isDesktop \? "16px" : "0" \}\}>\r?\n\s+<div style=\{\{ display: "flex", alignItems: "center", gap: "16px" \}\}>\r?\n\s+<button onClick=\{\(\) => setSelectedArtist\(null\)\}/;

code = code.replace(regexUI, `{selectedArtist || selectedAlbum ? (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px", paddingLeft: isDesktop ? "16px" : "0" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                        <button onClick={() => { setSelectedArtist(null); setSelectedAlbum(null); }}`);

const regexH2 = /<h2 style=\{\{ fontSize: isDesktop \? "28px" : "24px", fontWeight: "800", margin: 0, color: COLORS\.primary \}\}>\r?\n\s+\{selectedArtist\}\r?\n\s+<\/h2>/;
code = code.replace(regexH2, `<h2 style={{ fontSize: isDesktop ? "28px" : "24px", fontWeight: "800", margin: 0, color: COLORS.primary }}>
                          {selectedArtist || selectedAlbum}
                        </h2>`);

const regexEmpty = /\{selectedArtist\r?\n\s+\? <p style=\{\{ margin: 0, fontSize: "16px" \}\}>No songs found for \{selectedArtist\}\.<\/p>\r?\n\s+: searchQuery/;
code = code.replace(regexEmpty, `{selectedArtist || selectedAlbum
                        ? <p style={{ margin: 0, fontSize: "16px" }}>No songs found for {selectedArtist || selectedAlbum}.</p>
                        : searchQuery`);

fs.writeFileSync('src/App.jsx', code);
console.log('Done');
