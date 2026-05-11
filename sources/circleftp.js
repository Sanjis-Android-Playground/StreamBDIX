// StreamBDIX - By Corpse
const { extractQuality, titlesMatch, extractYear, axios } = require('./utils');
const SOURCE_NAME = 'CircleFTP';
const SERVERS = [
    { url: 'http://new.circleftp.net:5000/api', name: 'CircleFTP-New' },
    { url: 'http://main.circleftp.net/api', name: 'CircleFTP-Main' }
];
function extractEpisodeNumber(title) {
    let m = title.match(/S:?\d+[\.:]*E:?(\d+)/i);
    if (!m) m = title.match(/Episode[:\s]*(\d+)/i);
    return m ? parseInt(m[1]) : null;
}
async function search(query, server) {
    try {
        const response = await axios.get(`${server.url}/posts`, {
            params: { searchTerm: query, order: 'desc' },
            timeout: 5000
        });
        return response.data.posts || [];
    } catch { return []; }
}
async function getPostDetails(id, server) {
    try {
        const response = await axios.get(`${server.url}/posts/${id}`, { timeout: 5000 });
        return response.data;
    } catch { return null; }
}
async function getMovieStreams(name, year) {
    const allStreams = [];
    const seen = new Set();
    for (const server of SERVERS) {
        const posts = await search(name, server);
        const matches = posts.filter(p => {
            if (p.type !== 'singleVideo') return false;
            if (!titlesMatch(p.name || p.title, name)) return false;
            if (year && p.year && Math.abs(parseInt(p.year) - year) > 1) return false;
            return true;
        });
        if (matches.length === 0) continue;
        const details = await Promise.all(matches.map(m => getPostDetails(m.id, server).catch(() => null)));
        for (let i = 0; i < matches.length; i++) {
            const detail = details[i];
            if (!detail || !detail.content) continue;
            if (seen.has(detail.content)) continue;
            seen.add(detail.content);
            allStreams.push({
                name: SOURCE_NAME,
                title: `${server.name} - ${extractQuality(matches[i].quality || matches[i].title || detail.content)}`,
                url: detail.content
            });
        }
    }
    return allStreams;
}
async function getSeriesStreams(name, season, episode) {
    const allStreams = [];
    const seen = new Set();
    for (const server of SERVERS) {
        const posts = await search(name, server);
        const matches = posts.filter(p => {
            if (p.type !== 'series') return false;
            if (!titlesMatch(p.name || p.title, name)) return false;
            return true;
        });
        if (matches.length === 0) continue;
        const details = await Promise.all(matches.map(m => getPostDetails(m.id, server).catch(() => null)));
        for (let i = 0; i < matches.length; i++) {
            const detail = details[i];
            if (!detail || !Array.isArray(detail.content)) continue;
            const seasonData = detail.content.find(s => {
                const num = parseInt(s.seasonName.replace(/\D/g, ''));
                return num === season;
            });
            if (!seasonData || !seasonData.episodes) continue;
            const ep = seasonData.episodes.find(e => extractEpisodeNumber(e.title) === episode);
            if (!ep || !ep.link) continue;
            if (seen.has(ep.link)) continue;
            seen.add(ep.link);
            allStreams.push({
                name: SOURCE_NAME,
                title: `${server.name} - ${extractQuality(matches[i].quality || matches[i].title || ep.link)}`,
                url: ep.link
            });
        }
    }
    return allStreams;
}
module.exports = {
    name: SOURCE_NAME,
    types: ['movie', 'series'],
    async getStreams(type, meta, season, episode) {
        const name = meta.name;
        if (!name) return [];
        if (type === 'movie') {
            return await getMovieStreams(name, meta.year);
        } else {
            return await getSeriesStreams(name, season, episode);
        }
    }
};
