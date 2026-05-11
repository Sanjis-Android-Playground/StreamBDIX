// StreamBDIX - By Corpse
const { extractQuality, titlesMatch, axios } = require('./utils');
const SOURCE_NAME = 'FTPBD';
const SERVERS = [
    { url: 'https://server2.ftpbd.net/FTP-2', name: 'FTP-2', basePath: '/FTP-2' },
    { url: 'https://server3.ftpbd.net/FTP-3', name: 'FTP-3', basePath: '/FTP-3' },
    { url: 'https://server4.ftpbd.net/FTP-4', name: 'FTP-4', basePath: '/FTP-4' },
    { url: 'https://server5.ftpbd.net/FTP-5', name: 'FTP-5', basePath: '/FTP-5' },
    { url: 'https://server7.ftpbd.net/FTP-7', name: 'FTP-7', basePath: '/FTP-7' },
    { url: 'https://server1.ftpbd.net/FTP-1', name: 'FTP-1', basePath: '/FTP-1' }
];
const CATEGORIES = {
    movie: ['English Movies', 'Hindi Movies', 'South Indian Movies', 'Foreign Language Movies', 'Bangla Collection', 'Animation Movies', '3D Movies'],
    series: ['English-Foreign-TV-Series', 'Hindi TV Series', 'South Indian TV Serias', 'Anime--Cartoon-TV-Series']
};

function getNameFromPath(href) {
    const decoded = decodeURIComponent(href);
    const parts = decoded.split('/').filter(p => p);
    return parts[parts.length - 1] || '';
}

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
    const match = filename.match(/S(\d+)\D*E(\d+)/i);
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
            folders.push({ name, url: fullUrl, href });
        } else if (href.match(/\.(mkv|mp4|avi)$/i)) {
            files.push({ name, url: fullUrl, href });
        }
    }
    return { folders, files };
}

async function searchServer(server, type, searchTerm, season, episode) {
    const results = [];
    const categories = CATEGORIES[type] || CATEGORIES.movie;
    const searchLower = searchTerm.toLowerCase();
    const searchTerms = getSearchTerms(searchTerm);

    for (const cat of categories) {
        const catUrl = server.url + '/' + encodeURIComponent(cat) + '/';
        try {
            const response = await axios.get(catUrl, { timeout: 10000 });
            const { folders: yearFolders } = parseH5aiTable(response.data, catUrl);

            for (const yearFolder of yearFolders.slice(0, 20)) {
                if (results.length >= 10) break;
                try {
                    const yearResponse = await axios.get(yearFolder.url, { timeout: 10000 });
                    const { folders: movieFolders, files } = parseH5aiTable(yearResponse.data, yearFolder.url);

                    for (const file of files) {
                        if (results.length >= 10) break;
                        const { title, year } = extractTitleAndYear(file.name);
                        const matchScore = titlesMatch(title, searchTerm) ? 10 : 0;
                        if (matchScore > 0) {
                            results.push({
                                name: SOURCE_NAME,
                                title: `${server.name} - ${extractQuality(file.name)}`,
                                url: file.url
                            });
                        }
                    }

                    for (const movieFolder of movieFolders.slice(0, 30)) {
                        if (results.length >= 10) break;
                        const movieName = movieFolder.name.toLowerCase();
                        let matched = false;
                        for (const term of searchTerms) {
                            if (movieName.includes(term.toLowerCase())) {
                                matched = true;
                                break;
                            }
                        }
                        if (!matched && !titlesMatch(movieFolder.name, searchTerm)) continue;

                        try {
                            const movieResponse = await axios.get(movieFolder.url, { timeout: 10000 });
                            const { files: movieFiles } = parseH5aiTable(movieResponse.data, movieFolder.url);

                            for (const file of movieFiles) {
                                if (results.length >= 10) break;
                                const { title, year } = extractTitleAndYear(file.name);
                                const seInfo = extractSeasonEpisode(file.name);
                                if (type === 'movie') {
                                    if (titlesMatch(title, searchTerm)) {
                                        results.push({
                                            name: SOURCE_NAME,
                                            title: `${server.name} - ${extractQuality(file.name)}`,
                                            url: file.url
                                        });
                                    }
                                } else if (seInfo) {
                                    if (seInfo.season === season && seInfo.episode === episode) {
                                        results.push({
                                            name: SOURCE_NAME,
                                            title: `${server.name} - ${extractQuality(file.name)}`,
                                            url: file.url
                                        });
                                    }
                                }
                            }
                        } catch (e) {}
                    }
                } catch (e) {}
            }
        } catch (e) {}
    }
    return results;
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

module.exports = {
    name: SOURCE_NAME,
    types: ['movie', 'series'],
    async getStreams(type, meta, season, episode) {
        const imdbId = meta.imdb_id || meta.id;
        const name = meta.name || '';
        if (!name) return [];
        if (type === 'movie' && imdbId && imdbId.startsWith('tt')) {
            const dflixResults = await searchMovieByImdb(imdbId, name);
            if (dflixResults.length > 0) return dflixResults;
        }
        const allResults = [];
        for (const server of SERVERS) {
            const serverResults = await searchServer(server, type, name, season, episode);
            allResults.push(...serverResults);
        }
        const seen = new Set();
        const unique = allResults.filter(r => {
            if (seen.has(r.url)) return false;
            seen.add(r.url);
            return true;
        });
        return unique.slice(0, 10);
    }
};

async function searchMovieByImdb(imdbId, name) {
    return [];
}