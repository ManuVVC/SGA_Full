import React from 'react';
import SubMenuLayout from '../components/SubMenuLayout';
import { usePermissions } from '../hooks/usePermissions';
import { 
  PackageCheck, ListChecks, ArrowRightCircle, CheckSquare, 
  Archive, ArchiveRestore, Tags, 
  ArrowLeftRight, MapPin, Download, 
  ArrowDownToLine, Inbox, Truck,
  PackageSearch, PackageOpen, 
  Undo2, Reply, 
  Info, QrCode, ScanBarcode, BoxSelect, Blocks,
  RefreshCcw, Layers, Printer, BarChart2, SlidersHorizontal, Scissors,
  LogIn, PackagePlus
} from 'lucide-react';

export function SubMenuPrepara() {
  const { hasPermission } = usePermissions();
  const items = [
    { label: 'Prepara Pedido', icon: PackageCheck, path: '', show: hasPermission('PRM_PREPARARPEDIDOCLIENTE') },
    { label: 'Repasar Pedido', icon: ListChecks, path: '', show: hasPermission('PRM_REPASOORDENESDECARGAAUTO') },
    { label: 'Pedido Directo', icon: ArrowRightCircle, path: '', show: hasPermission('PRM_PREPARARPEDIDODIRECTO') },
    { label: 'Finalizar', icon: CheckSquare, path: '', show: true },
    { label: 'Aparcar', icon: Archive, path: '', show: hasPermission('PRM_APARCARDOCUMENTO') },
    { label: 'Recup.Aparcado', icon: ArchiveRestore, path: '', show: hasPermission('PRM_RECUPERARDOCUMENTOAPARCADO') },
    { label: 'Etiq. Bultos', icon: Tags, path: '', show: true },
  ].filter(i => i.show);
  return <SubMenuLayout title="PREPARA PEDIDO" items={items} />;
}

export function SubMenuReubicar() {
  const { hasPermission } = usePermissions();
  const items = [
    { label: 'Reubicar', icon: ArrowLeftRight, path: '/reubicar/libre', show: hasPermission('PRM_REUBICAR') },
    { label: 'Reub. Guiado', icon: MapPin, path: '', show: hasPermission('PRM_PUEDEHACERREUBICGUIADA') },
    { label: 'Reub. Ent.Merc', icon: Download, path: '/reubicar/entrada', show: hasPermission('PRM_REUBICAR') },
    { label: 'Reub. Masivas', icon: Blocks, path: '', show: hasPermission('PRM_REUBICACIONESMASIVAS') },
  ].filter(i => i.show);
  return <SubMenuLayout title="REUBICAR" items={items} />;
}

export function SubMenuEntrada() {
  const { hasPermission } = usePermissions();
  const items = [
    { label: 'Entrada Mercan', icon: LogIn, path: '/entrada/recepcion', show: hasPermission('PRM_ENTRADADEMERCANCIAS') },
    { label: 'Finalizar', icon: CheckSquare, path: '', show: true },
    { label: 'Recepcion Inter.', icon: ArrowLeftRight, path: '', show: hasPermission('PRM_REC_MERCANCIA_INTERCOMPANY') },
    { label: 'Ent. Devolucion', icon: Undo2, path: '', show: hasPermission('PRM_ENTRADADEVOLUCION') },
    { label: 'Ent. Prod. Fabrica', icon: PackagePlus, path: '', show: hasPermission('PRM_ENTRADA_PROD_FABRICA') },
  ].filter(i => i.show);
  return <SubMenuLayout title="ENTRADAS" items={items} />;
}

export function SubMenuInventario() {
  const items = [
    { label: 'Inventario', icon: PackageSearch, path: '', show: true },
    { label: 'Invent. Repas', icon: PackageOpen, path: '', show: true },
  ].filter(i => i.show);
  return <SubMenuLayout title="INVENTARIO" items={items} />;
}

export function SubMenuDevoluciones() {
  const { hasOperatorPermission } = usePermissions();
  const items = [
    { label: 'Dev. Cliente', icon: Undo2, path: '/devoluciones/cliente', show: hasOperatorPermission('PRM_DEVOLUCIONESCLIENTE') },
    { label: 'Finalizar Dev. Cliente', icon: CheckSquare, path: '/devoluciones/finalizar-cliente', show: hasOperatorPermission('PRM_DEVOLUCIONESCLIENTE') },
    { label: 'Dev. Proveedor', icon: Reply, path: '', show: hasOperatorPermission('PRM_DEVOLUCIONESPROVEEDOR') },
    { label: 'Finalizar Dev. Proveedor', icon: CheckSquare, path: '/devoluciones/finalizar-proveedor', show: hasOperatorPermission('PRM_DEVOLUCIONESPROVEEDOR') },
  ].filter(i => i.show);
  return <SubMenuLayout title="DEVOLUCIONES" items={items} />;
}

export function SubMenuUtilidades() {
  const { hasPermission } = usePermissions();
  const items = [
    { label: 'Info Articulo', icon: Info, path: '/stock', show: true },
    { label: 'Info Ubicacion', icon: MapPin, path: '/utilidades/info-ubicacion', show: true },
    { label: 'Nuevo C.Barras', icon: QrCode, path: '/utilidades/nuevo-ean', show: hasPermission('PRM_ALTAEAN') },
    { label: 'Regula Stock', icon: RefreshCcw, path: '', show: hasPermission('PRM_REGULARIZARSTOCK') },
    { label: 'Montar Kits', icon: Layers, path: '', show: true },
    { label: 'Montar Palets', icon: Blocks, path: '', show: true },
    { label: 'Imp. Terminal', icon: Printer, path: '', show: true },
    { label: 'Estadisticas', icon: BarChart2, path: '', show: hasPermission('PRM_ESTADISTICAS') },
    { label: 'Mod. Min/Max Art', icon: SlidersHorizontal, path: '', show: hasPermission('PRM_PUEDEMODIFMINMAXARTICULO') },
    { label: 'Desmontaje Kits', icon: Scissors, path: '', show: hasPermission('PRM_DESMONTARKIT') },
  ].filter(i => i.show);
  return <SubMenuLayout title="UTILIDADES" items={items} />;
}
