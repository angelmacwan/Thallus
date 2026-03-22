content = open('/Users/angel/Documents/mv2/frontend/src/views/Session.jsx').read()

old = "\t\t\t\t\t\t\tborder: '1px solid rgba(232,114,10,0.35)',\n\t\t\t\t\t\t\tbackground: 'rgba(14,8,2,0.88)',\n\t\t\t\t\t\t\tcolor: '#d4c8bc',"
new = "\t\t\t\t\t\t\tborder: '1px solid #e7e8e8',\n\t\t\t\t\t\t\tbackground: 'rgba(255,255,255,0.96)',\n\t\t\t\t\t\t\tcolor: '#12283c',"

if old in content:
    print('FOUND - replacing')
    result = content.replace(old, new, 1)
    # also add boxShadow after justifyContent
    result = result.replace(
        "\t\t\t\t\t\t\tjustifyContent: 'center',\n\t\t\t\t\t\t}}",
        "\t\t\t\t\t\t\tjustifyContent: 'center',\n\t\t\t\t\t\t\tboxShadow: '0 1px 4px rgba(25,28,28,0.08)',\n\t\t\t\t\t\t}}",
        1
    )
    open('/Users/angel/Documents/mv2/frontend/src/views/Session.jsx', 'w').write(result)
    print('DONE')
else:
    print('NOT FOUND')
    # show context
    idx = content.find('rgba(232,114,10,0.35)')
    if idx >= 0:
        print(repr(content[idx-50:idx+100]))
