"""Explainable topic routing and optional local editorial corrections.

Rules classify headlines, not the truth of the publisher's claims. Missing
summaries stay missing. Overrides never change the original title or source URL.
"""
import json
import re
from pathlib import Path

ROUTES = {
    'models': ['concept/parameters', 'concept/attention', 'concept/context'],
    'agents': ['concept/agent', 'concept/mcp', 'act/5/0'],
    'science': ['act/3/0', 'concept/learning', 'act/3/1'],
    'applications': ['act/1/0', 'act/3/0', 'library/1/0'],
    'society': ['act/6/0', 'act/6/2', 'act/6/3'],
}
# A specific headline signal wins over a passing mention in a description.
# Broad terms such as "research", "assistant" and "security" deliberately do
# not turn every product announcement into science, agents, or governance.
RULES = {
    'models': r'\b(model\w*|gemini|gpt[ -]?\d\w*|training|inference|lora|transformer\w*|fine.tun\w*|quantiz\w*|embedding\w*|tokeniz\w*)\b',
    'agents': r'\b(agent\w*|workflow\w*|tool use|tool calling|mcp|computer use)\b',
    'science': r'\b(scien\w*|genom\w*|protein\w*|alphafold|biology|molecular|materials discovery|navier.stokes|theorem\w*|mathemat\w*|physics|weather forecast\w*)\b',
    'applications': r'\b(productivity|financial services|education|healthcare|marketing|customer service|engineering teams|shopping|translation|classroom\w*)\b',
    'society': r'\b(safety|governance|privacy|copyright|regulation\w*|policy|policies|responsible|misuse|cybersecurity|cyber|safeguard\w*|misalignment|alignment|security incident)\b',
}


def annotate(title, summary):
    normalized = re.sub(r'[\u2010-\u2015]', '-', title.lower())
    headline = {topic: re.findall(pattern, normalized) for topic, pattern in RULES.items()}
    description = {topic: re.findall(pattern, summary.lower()) for topic, pattern in RULES.items()}
    pool = headline if any(headline.values()) else description
    ranked = sorted(pool, key=lambda topic: len(set(pool[topic])), reverse=True)
    topic = ranked[0] if pool[ranked[0]] else 'applications'
    # "Model misalignment" is a safety topic; the generic word model should
    # not overpower an explicit governance or incident headline.
    if re.search(r'\b(misalignment|safety overview|privacy|copyright|governance|policy|policies|security incident)\b', normalized):
        topic = 'society'
        pool = headline
    matches = list(dict.fromkeys(pool[topic]))[:3]
    return {
        'topic': topic,
        'related': ROUTES[topic][0],
        'relatedRoutes': ROUTES[topic],
        'classification': {
            'method': 'headline' if matches and pool is headline else 'summary' if matches else 'fallback',
            'terms': matches,
        },
    }


def load_overrides(path):
    path = Path(path)
    data = json.loads(path.read_text(encoding='utf-8')) if path.exists() else {'items': {}}
    if not isinstance(data, dict) or not isinstance(data.get('items'), dict):
        raise ValueError('Editorial overrides must contain an items object')
    for url, item in data['items'].items():
        if not isinstance(url, str) or not isinstance(item, dict):
            raise ValueError('Invalid editorial entry')
        if item.get('topic') not in ROUTES:
            raise ValueError('Unknown editorial topic')
        if not isinstance(item.get('reason'), str) or not item['reason'].strip():
            raise ValueError('An editorial correction needs a reason')
        for key in ('question', 'readingHint'):
            if key in item and (not isinstance(item[key], str) or len(item[key]) > 500):
                raise ValueError('Invalid editorial reading guidance')
    return data['items']


def enrich(item, overrides):
    result = {**item, **annotate(item['title'], item.get('summary', ''))}
    override = overrides.get(item['url'])
    if override:
        topic = override['topic']
        result.update(topic=topic, related=ROUTES[topic][0], relatedRoutes=ROUTES[topic],
                      classification={'method': 'editorial', 'reason': override['reason']})
        result['editorial'] = {key: override[key] for key in ('question', 'readingHint') if key in override}
    return result
