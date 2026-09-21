import re

files = [
    'src/app/(tabs)/more.tsx', 'src/app/analytics.tsx',
    'src/app/auth/forgot-password.tsx', 'src/app/auth/sign-in.tsx',
    'src/app/auth/sign-up.tsx', 'src/app/data-quality.tsx', 'src/app/goals.tsx',
    'src/app/insights.tsx', 'src/app/life-timeline.tsx', 'src/app/search.tsx',
    'src/app/settings/index.tsx', 'src/app/weekly-review.tsx',
    'src/components/account/AccountGate.tsx', 'src/components/dashboard/FocusInsightCard.tsx',
    'src/components/dashboard/XPLevelCard.tsx', 'src/components/finance/VirtualAccountCard.tsx',
    'src/components/more/UserProfileHeader.tsx',
]

pattern = re.compile(r"(['\"])(.*?)\1")
for path in files:
    text = open(path, encoding='utf-8').read()
    def replace(match):
        quote, value = match.groups()
        if 'jeevya:' in value.lower() or '@jeevya' in value.lower():
            return match.group(0)
        return quote + value.replace('Jeevya', 'Jeevya') + quote
    updated = pattern.sub(replace, text)
    if updated != text:
        open(path, 'w', encoding='utf-8').write(updated)
        print(path)
