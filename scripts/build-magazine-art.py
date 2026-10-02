"""Reproducible original vector illustrations; no measured market data represented."""
from pathlib import Path
import html
root=Path(__file__).resolve().parents[1]/'assets/images/magazin'
root.mkdir(exist_ok=True)
shapes={
 'market': '<path d="M250 510V260M250 510H950"/><path d="M290 450L440 370L570 405L710 290L900 230" stroke="#e88180" stroke-width="12"/><circle cx="440" cy="370" r="12" fill="#e88180"/><circle cx="710" cy="290" r="12" fill="#e88180"/><path d="M300 550H830" opacity=".3"/>',
 'region': '<path d="M240 520V330H360V520M370 520V240H505V520M520 520V380H650V520M670 520V290H795V520M810 520V360H940V520"/><path d="M405 295H460M405 340H460M405 385H460M700 340H760M700 385H760"/><path d="M710 210C710 125 830 125 830 210C830 260 770 310 770 310S710 260 710 210Z" fill="#e88180" stroke="#e88180"/><circle cx="770" cy="210" r="20" stroke="#fff9f3"/>',
 'finance': '<rect x="290" y="180" width="290" height="390" rx="22" fill="#fff9f3"/><path d="M335 260H535M335 320H475M335 380H505M335 440H455"/><circle cx="780" cy="400" r="120" fill="#e88180" stroke="none"/><path d="M820 335C730 300 705 400 745 455C765 478 805 475 825 460M705 380H795M705 420H785" stroke="#fff9f3"/>',
 'valuation': '<path d="M285 390L460 235L635 390M330 370V560H590V370M420 560V440H500V560"/><circle cx="790" cy="330" r="90" fill="#fff9f3"/><path d="M860 400L950 500" stroke-width="22"/><path d="M750 335H830M790 295V375" stroke="#e88180"/>',
 'digital': '<rect x="260" y="200" width="680" height="370" rx="18"/><path d="M200 600H1000M440 420L585 295L730 420M470 400V505H700V400"/><path d="M805 250V330M765 290H845" stroke="#e88180"/><path d="M350 250V300M325 275H375" stroke="#e88180"/>',
 'generation': '<path d="M315 330L600 150L885 330M360 315V580H840V315"/><circle cx="480" cy="370" r="45"/><circle cx="690" cy="340" r="55"/><path d="M405 570V470C405 420 555 420 555 470V570M590 570V455C590 390 790 390 790 455V570"/><path d="M555 470L590 455" stroke="#e88180" stroke-width="14"/>',
 'plan': '<rect x="300" y="160" width="600" height="420" fill="#fff9f3"/><path d="M580 160V400M300 400H690M730 400H900M580 450V580M740 160V290M740 340V400"/><path d="M240 160V580M225 160H255M225 580H255M300 635H900M300 620V650M900 620V650" stroke="#e88180"/>',
 'energy': '<path d="M270 365L465 210L660 365M310 345V570H620V345M365 410H430V480H365Z"/><path d="M760 200L650 405H760L700 590L945 325H810L865 200Z" fill="#e88180" stroke="none"/>',
 'checklist': '<rect x="350" y="170" width="500" height="430" rx="16" fill="#fff9f3"/><path d="M410 275L435 300L485 240M410 395L435 420L485 360M410 515L435 540L485 480" stroke="#e88180"/><path d="M540 275H770M540 395H730M540 515H750"/>',
 'documents': '<rect x="320" y="150" width="420" height="420" rx="12"/><rect x="470" y="240" width="400" height="360" rx="12" fill="#fff9f3"/><path d="M530 325H800M530 395H770M530 465H720"/><path d="M360 200H660" stroke="#e88180"/>',
 'time': '<circle cx="600" cy="380" r="215" fill="#fff9f3"/><path d="M600 200V235M600 525V560M420 380H455M745 380H780"/><path d="M600 260V380L730 445" stroke="#e88180" stroke-width="14"/><circle cx="600" cy="380" r="12" fill="#345b6e"/>',
 'legal': '<path d="M600 205V560M465 560H735M385 285H815M440 285L355 450H525ZM760 285L675 450H845Z"/><circle cx="600" cy="240" r="24" fill="#e88180" stroke="#e88180"/>',
 'portfolio': '<rect x="265" y="300" width="175" height="260" rx="8"/><rect x="510" y="180" width="175" height="380" rx="8" fill="#fff9f3"/><rect x="755" y="370" width="175" height="190" rx="8" fill="#e88180" stroke="none"/><path d="M265 610H930M310 350H395M555 235H640M555 300H640"/>',
 'house': '<path d="M230 350L600 145L970 350M290 315V590H910V315"/><path d="M400 365H520V485H400ZM680 590V390H800V590M600 145V85H730V218"/><path d="M210 635H990" stroke="#e88180"/>'
}
for name,shape in shapes.items():
 svg=f'''<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800"><rect width="1200" height="800" fill="#e9efed"/><circle cx="1030" cy="100" r="300" fill="#d9e4e5"/><circle cx="90" cy="740" r="230" fill="#f5efe5"/><g fill="none" stroke="#345b6e" stroke-width="8" stroke-linecap="round" stroke-linejoin="round">{shape}</g><path d="M60 725H150" stroke="#e88180" stroke-width="5"/></svg>'''
 (root/(name+'.svg')).write_text(svg)
print('Illustrations:',len(shapes))
