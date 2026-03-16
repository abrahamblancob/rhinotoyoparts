import { ArrowLeft, ArrowRight, Check, Warehouse } from 'lucide-react';
import { FloorPlanBuilder } from './FloorPlanBuilder.tsx';
import { ZonePainter } from './ZonePainter.tsx';
import { useWarehouseWizard } from './wizard/useWarehouseWizard.ts';
import { StepIndicator } from './wizard/StepIndicator.tsx';
import { WarehouseStep } from './wizard/WarehouseStep.tsx';
import { RacksStep } from './wizard/RacksStep.tsx';
import { ConfirmStep } from './wizard/ConfirmStep.tsx';

export function WarehouseSetupWizard() {
  const w = useWarehouseWizard();

  return (
    <div>
      {/* Page Header */}
      <div className="rh-page-header">
        <h1 className="rh-page-title">
          <Warehouse
            size={24}
            style={{ display: 'inline', marginRight: 8, verticalAlign: 'middle' }}
          />
          {w.editId ? 'Editar Almacen' : 'Configurar Almacen'}
        </h1>
        <p className="rh-page-subtitle">
          {w.editId
            ? 'Modifica las dimensiones, estantes y distribucion de tu almacen'
            : 'Configura las dimensiones, estantes y distribucion de tu almacen'}
        </p>
      </div>

      {/* Step Indicator */}
      <StepIndicator
        currentStep={w.currentStep}
        currentIndex={w.currentIndex}
        onStepClick={w.setCurrentStep}
      />

      {w.error && <div className="rh-alert rh-alert-error mb-4">{w.error}</div>}

      {w.editLoading && (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <p className="rh-loading">Cargando configuracion del almacen...</p>
        </div>
      )}

      {/* Step Content */}
      {!w.editLoading && (
        <div className="rh-card" style={{ padding: 24 }}>
          {w.currentStep === 'warehouse' && (
            <WarehouseStep
              warehouse={w.warehouse}
              setWarehouse={w.setWarehouse}
              isPlatform={w.isPlatform}
              aggregators={w.aggregators}
              selectedAggregatorId={w.selectedAggregatorId}
              setSelectedAggregatorId={w.setSelectedAggregatorId}
            />
          )}

          {w.currentStep === 'racks' && (
            <RacksStep
              wizardAisles={w.wizardAisles}
              racks={w.racks}
              addAisle={w.addAisle}
              removeAisle={w.removeAisle}
              updateAisle={w.updateAisle}
              addRack={w.addRack}
              removeRack={w.removeRack}
              updateRack={w.updateRack}
              totalLocations={w.totalLocations}
              rackDisplayCode={w.rackDisplayCode}
            />
          )}

          {w.currentStep === 'layout' && w.warehouse.width_m && w.warehouse.length_m && (
            <div style={{ height: 'calc(100vh - 320px)', minHeight: 400 }}>
              <FloorPlanBuilder
                warehouseWidth={w.warehouse.width_m}
                warehouseLength={w.warehouse.length_m}
                racks={w.racks}
                placedRacks={w.placedRacks}
                onPlacedRacksChange={w.setPlacedRacks}
                aisles={w.wizardAisles}
                placedAisles={w.placedAisles}
                onPlacedAislesChange={w.setPlacedAisles}
              />
            </div>
          )}

          {w.currentStep === 'zones' && w.warehouse.width_m && w.warehouse.length_m && (
            <div style={{ height: 'calc(100vh - 320px)', minHeight: 400 }}>
              <ZonePainter
                warehouseWidth={w.warehouse.width_m}
                warehouseLength={w.warehouse.length_m}
                placedRacks={w.placedRacks}
                racks={w.racks}
                aisles={w.wizardAisles}
                placedAisles={w.placedAisles}
                zones={w.zones}
                onZonesChange={w.setZones}
              />
            </div>
          )}

          {w.currentStep === 'confirm' && (
            <ConfirmStep
              warehouse={w.warehouse}
              racks={w.racks}
              wizardAisles={w.wizardAisles}
              placedRacks={w.placedRacks}
              placedAisles={w.placedAisles}
              zones={w.zones}
              rackDisplayCode={w.rackDisplayCode}
              area={w.area}
              totalLocations={w.totalLocations}
              rackFootprint={w.rackFootprint}
              occupancyPct={w.occupancyPct}
            />
          )}
        </div>
      )}

      {/* Navigation Buttons */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: 20,
          paddingTop: 16,
        }}
      >
        <button
          onClick={
            w.currentIndex === 0
              ? () => w.navigate('/hub/warehouse')
              : w.goPrev
          }
          className="rh-btn rh-btn-ghost"
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <ArrowLeft size={16} />
          {w.currentIndex === 0 ? 'Cancelar' : 'Anterior'}
        </button>

        {w.currentStep === 'confirm' ? (
          <button
            onClick={w.handleSave}
            disabled={w.saving}
            className="rh-btn rh-btn-primary"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              minWidth: 160,
            }}
          >
            {w.saving ? (
              w.editId ? 'Guardando cambios...' : 'Creando almacen...'
            ) : (
              <>
                <Check size={16} />
                {w.editId ? 'Guardar Cambios' : 'Crear Almacen'}
              </>
            )}
          </button>
        ) : (
          <button
            onClick={w.goNext}
            disabled={!w.canProceed()}
            className="rh-btn rh-btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            {w.currentStep === 'zones' ? 'Siguiente (o saltar)' : 'Siguiente'}
            <ArrowRight size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
