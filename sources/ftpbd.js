// StreamBDIX - By Corpse
const { extractQuality, titlesMatch, axios } = require('./utils');
const SOURCE_NAME = 'FTPBD';
const SERVERS = [
    { url: 'https://server2.ftpbd.net/FTP-2', name: 'FTP-2' },
    { url: 'https://server3.ftpbd.net/FTP-3', name: 'FTP-3' },
    { url: 'https://server4.ftpbd.net/FTP-4', name: 'FTP-4' },
    { url: 'https://server5.ftpbd.net/FTP-5', name: 'FTP-5' },
    { url: 'https://server7.ftpbd.net/FTP-7', name: 'FTP-7' },
    { url: 'https://server1.ftpbd.net/FTP-1', name: 'FTP-1' },
    { url: 'http://ftp8.circleftp.net/FILE', name: 'FTP8' }
];
const CATEGORIES = {
    movie: ['English Movies', 'Hindi Movies', 'South Indian Movies', 'Foreign Language Movies', 'Bangla Collection', 'Animation Movies', '3D Movies'],
    series: ['English-Foreign-TV-Series', 'Hindi TV Series', 'South Indian TV Serias', 'Anime--Cartoon-TV-Series', 'Indian TV Shows', 'TV Shows']
};

function extractTitleAndYear(filename) {
    let match = filename.match(/^(.+?)\s*\((\d{4})\)/);
    if (match) return { title: match[1].trim(), year: parseInt(match[2]) };
    match = filename.match(/\b(19\d{2}|20\d{2})\b/);
    if (match) {
        const year = parseInt(match[1]);
        const titleMatch = filename.match(/^(.+?)(?:\s*[\(\[\-\|]|\s+\d{4}|$)/);
        return { title: titleMatch ? titleMatch[1].trim() : filename, year };
    }
    return { title: filename, year: null };
}

function extractSeasonEpisode(filename) {
    let match = filename.match(/S(\d+)[\s.\-]*EP\.?(\d+)/i);
    if (match) return { season: parseInt(match[1]), episode: parseInt(match[2]) };
    match = filename.match(/Season[\s\-]*(\d+)[\s\S]*?Ep[\s\-]*(\d+)/i);
    if (match) return { season: parseInt(match[1]), episode: parseInt(match[2]) };
    match = filename.match(/(\d+)x(\d+)/i);
    if (match) return { season: parseInt(match[1]), episode: parseInt(match[2]) };
    return null;
}

function parseH5aiTable(html, baseUrl) {
    const rows = html.match(/<tr[\s\S]*?<\/tr>/gi) || [];
    const folders = [];
    const files = [];
    const baseOrigin = new URL(baseUrl).origin;
    for (const row of rows) {
        if (row.includes('folder-parent')) continue;
        const hrefMatch = row.match(/<a href="([^"]+)">([^<]+)<\/a>/);
        if (!hrefMatch) continue;
        const href = hrefMatch[1];
        const name = hrefMatch[2];
        let fullUrl;
        if (href.startsWith('http')) {
            fullUrl = href;
        } else if (href.startsWith('/')) {
            fullUrl = baseOrigin + href;
        } else {
            fullUrl = baseUrl.replace(/\/$/, '') + '/' + href;
        }
        if (row.includes('folder.png')) {
            folders.push({ name, url: fullUrl });
        } else if (href.match(/\.(mkv|mp4|avi)$/i)) {
            files.push({ name, url: fullUrl });
        }
    }
    return { folders, files };
}

function getSearchTerms(title) {
    const cleaned = title.replace(/[:\-–—]/g, ' ').replace(/\s+/g, ' ').trim();
    const words = cleaned.split(' ').filter(w => w.length > 2);
    const terms = [];
    if (words.length > 0) terms.push(words[0]);
    if (words.length > 1) terms.push(words.slice(0, 2).join(' '));
    terms.push(cleaned);
    return [...new Set(terms)];
}

function titleMatchesFolder(folderName, searchTerms, searchTerm) {
    const fnLower = folderName.toLowerCase();
    if (folderName.match(/^\d{4}$/)) return true;
    for (const term of searchTerms) {
        if (fnLower.includes(term.toLowerCase())) return true;
    }
    return titlesMatch(folderName, searchTerm);
}

async function findMatchingFiles(folder, searchTerms, searchTerm, type, season, episode) {
    const matches = [];
    try {
        const response = await axios.get(folder.url, { timeout: 10000 });
        const { folders: subFolders, files } = parseH5aiTable(response.data, folder.url);

        for (const file of files) {
            if (type === 'movie') {
                const { title } = extractTitleAndYear(file.name);
                if (titlesMatch(title, searchTerm)) {
                    matches.push({ name: SOURCE_NAME, title: `${folder.name.split('/').pop().split('/').pop()} - ${extractQuality(file.name)}`, url: file.url });
                }
            } else {
                const seInfo = extractSeasonEpisode(file.name);
                if (seInfo && seInfo.season === season && seInfo.episode === episode) {
                    matches.push({ name: SOURCE_NAME, title: `${folder.name.split('/').pop()} - ${extractQuality(file.name)}`, url: file.url });
                }
            }
        }

        for (const subFolder of subFolders) {
            const subName = subFolder.name;
            const isYearFolder = subName.match(/^\d{4}$/) || subName.includes('Season');
            const isMatchedFolder = titleMatchesFolder(subName, searchTerms, searchTerm);

            if (isYearFolder || isMatchedFolder) {
                const subMatches = await findMatchingFiles(subFolder, searchTerms, searchTerm, type, season, episode);
                matches.push(...subMatches);
            }
        }
    } catch (e) {}
    return matches;
}

async function searchServer(server, type, searchTerm, season, episode) {
    const results = [];
    const categories = CATEGORIES[type] || CATEGORIES.movie;
    const searchTerms = getSearchTerms(searchTerm);

    for (const cat of categories) {
        const catUrl = server.url + '/' + encodeURIComponent(cat) + '/';
        try {
            const response = await axios.get(catUrl, { timeout: 10000 });
            const { folders: topFolders } = parseH5aiTable(response.data, catUrl);

            for (const folder of topFolders) {
                if (results.length >= 10) break;
                if (titleMatchesFolder(folder.name, searchTerms, searchTerm)) {
                    const matches = await findMatchingFiles(folder, searchTerms, searchTerm, type, season, episode);
                    for (const m of matches) {
                        if (results.length >= 10) break;
                        results.push({ name: SOURCE_NAME, title: `${server.name} - ${m.title}`, url: m.url });
                    }
                }
            }
        } catch (e) {}
    }
    return results;
}

module.exports = {
    name: SOURCE_NAME,
    types: ['movie', 'series'],
    async getStreams(type, meta, season, episode) {
        const name = meta.name || '';
        if (!name) return [];
        const allResults = [];
        for (const server of SERVERS) {
            const serverResults = await searchServer(server, type, name, season, episode);
            allResults.push(...serverResults);
        }
        const seen = new Set();
        return allResults.filter(r => {
            if (seen.has(r.url)) return false;
            seen.add(r.url);
            return true;
        }).slice(0, 10);
    }
};