"""Checks the SCORM packages: each zip has a valid SCORM 1.2 imsmanifest.xml (one SCO launching
index.html), the launch page, and the offline game file it redirects to.
Usage (from safety-game/): python3 tests/scorm-check.py   (runs src/scorm.py --no-build first)"""
import os, re, subprocess, sys, zipfile
import xml.etree.ElementTree as ET

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
subprocess.check_call([sys.executable, os.path.join(root, 'src', 'scorm.py'), '--no-build'], cwd=root)
NS = {'cp': 'http://www.imsproject.org/xsd/imscp_rootv1p1p2', 'adlcp': 'http://www.adlnet.org/xsd/adlcp_rootv1p2'}
out = os.path.join(root, 'dist', 'scorm'); fail = 0
zips = sorted(f for f in os.listdir(out) if f.endswith('.zip'))
for need in ('site-life-factory.zip', 'site-life-kids-home.zip', 'site-life-kids-school.zip'):
    if need not in zips: print('FAIL missing', need); fail = 1
for f in zips:
    z = zipfile.ZipFile(os.path.join(out, f)); names = set(z.namelist())
    try:
        m = ET.fromstring(z.read('imsmanifest.xml'))
        assert m.find('cp:metadata/cp:schemaversion', NS).text == '1.2'
        res = m.find('cp:resources/cp:resource', NS)
        assert res.get('{%s}scormtype' % NS['adlcp']) == 'sco' and res.get('href') == 'index.html'
        files = {x.get('href') for x in res.findall('cp:file', NS)}
        assert files <= names, 'manifest lists files not in the zip: %s' % (files - names)
        target = re.search(r"location\.replace\('([^']+)'\)", z.read('index.html').decode()).group(1)
        assert target.split('?')[0] in names, 'launch target missing: ' + target
        if 'kids-' in f: assert target.endswith('?world=' + f[len('site-life-kids-'):-4]), target
        assert b'var SL_OFFLINE_FILE = true' in z.read(target.split('?')[0])
        print('ok  ', f, '->', target)
    except Exception as e:
        print('FAIL', f, repr(e)); fail = 1
print('SCORM PACKAGES PASSED' if not fail else 'SCORM PACKAGES FAILED')
sys.exit(fail)
